const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const neo4j = require('neo4j-driver');
const redis = require('redis');
const axios = require('axios');
require('dotenv').config();

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:18789'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  logger.info({
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Initialize connections
let neo4jDriver;
let redisClient;

// Neo4j connection
const initNeo4j = () => {
  try {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME || 'neo4j',
        process.env.NEO4J_PASSWORD || 'marketsense123'
      )
    );
    logger.info('Neo4j driver initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Neo4j driver:', error);
    process.exit(1);
  }
};

// Redis connection
const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6380'
    });
    
    redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
    redisClient.on('connect', () => logger.info('Redis connected'));
    
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to initialize Redis client:', error);
    process.exit(1);
  }
};

// MarketSense Knowledge Graph Integration
app.post('/api/knowledge/query', async (req, res) => {
  try {
    const { query, context, sessionId } = req.body;
    const session = neo4jDriver.session();
    
    // Store query context in Redis for Open Claw access
    await redisClient.setEx(`session:${sessionId}:context`, 3600, JSON.stringify(context));
    
    // Execute knowledge graph query
    const result = await session.run(query, context);
    const records = result.records.map(record => record.toObject());
    
    await session.close();
    
    res.json({
      success: true,
      data: records,
      sessionId,
      timestamp: new Date().toISOString()
    });
    
    logger.info(`Knowledge query executed for session ${sessionId}`);
  } catch (error) {
    logger.error('Knowledge query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute knowledge query',
      details: error.message
    });
  }
});

// Open Claw Agent Registration
app.post('/api/agents/register', async (req, res) => {
  try {
    const { agentId, capabilities, configuration } = req.body;
    
    // Store agent configuration in Neo4j
    const session = neo4jDriver.session();
    const query = `
      MERGE (a:Agent {id: $agentId})
      SET a.capabilities = $capabilities,
          a.configuration = $configuration,
          a.registeredAt = datetime(),
          a.status = 'active'
      RETURN a
    `;
    
    await session.run(query, { agentId, capabilities, configuration });
    await session.close();
    
    // Cache agent info in Redis
    await redisClient.setEx(
      `agent:${agentId}:config`,
      3600,
      JSON.stringify({ capabilities, configuration })
    );
    
    res.json({
      success: true,
      message: 'Agent registered successfully',
      agentId
    });
    
    logger.info(`Agent ${agentId} registered successfully`);
  } catch (error) {
    logger.error('Agent registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register agent'
    });
  }
});

// MarketSense Event Stream Integration
app.post('/api/events/publish', async (req, res) => {
  try {
    const { eventType, payload, source = 'openclaw-integration' } = req.body;
    const eventId = uuidv4();
    
    const event = {
      id: eventId,
      type: eventType,
      source,
      payload,
      timestamp: new Date().toISOString()
    };
    
    // Publish to Redis for other MarketSense services
    await redisClient.publish('marketsense:events', JSON.stringify(event));
    
    // Store in Neo4j for persistence
    const session = neo4jDriver.session();
    const query = `
      CREATE (e:Event {
        id: $id,
        type: $type,
        source: $source,
        payload: $payload,
        timestamp: datetime($timestamp)
      })
      RETURN e
    `;
    
    await session.run(query, event);
    await session.close();
    
    res.json({
      success: true,
      eventId,
      message: 'Event published successfully'
    });
    
    logger.info(`Event ${eventId} published: ${eventType}`);
  } catch (error) {
    logger.error('Event publishing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish event'
    });
  }
});

// Chat Integration Endpoint
app.post('/api/chat/process', async (req, res) => {
  try {
    const { message, sessionId, userId } = req.body;
    
    // Forward to Open Claw gateway
    const openclawResponse = await axios.post(
      `${process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'}/api/chat`,
      {
        message,
        sessionId,
        context: {
          marketsense: {
            userId,
            timestamp: new Date().toISOString()
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      success: true,
      response: openclawResponse.data,
      sessionId
    });
    
    logger.info(`Chat message processed for session ${sessionId}`);
  } catch (error) {
    logger.error('Chat processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message'
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      neo4j: 'unknown',
      redis: 'unknown',
      openclaw: 'unknown'
    }
  };
  
  try {
    // Check Neo4j
    const session = neo4jDriver.session();
    await session.run('RETURN 1');
    await session.close();
    health.services.neo4j = 'healthy';
  } catch {
    health.services.neo4j = 'unhealthy';
    health.status = 'degraded';
  }
  
  try {
    // Check Redis
    await redisClient.ping();
    health.services.redis = 'healthy';
  } catch {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }
  
  try {
    // Check Open Claw
    await axios.get(`${process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'}/health`, {
      timeout: 5000
    });
    health.services.openclaw = 'healthy';
  } catch {
    health.services.openclaw = 'unhealthy';
    health.status = 'degraded';
  }
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error({
    requestId: req.id,
    error: error.message,
    stack: error.stack
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: req.id
  });
});

// Start server
const startServer = async () => {
  try {
    await initNeo4j();
    await initRedis();
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`MarketSense Open Claw Integration Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  
  if (neo4jDriver) {
    await neo4jDriver.close();
  }
  
  if (redisClient) {
    await redisClient.quit();
  }
  
  process.exit(0);
});

startServer();
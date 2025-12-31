/**
 * Documentation Generator for AppForge
 * Automatically generates API docs, user guides, and deployment instructions
 */

import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { storagePut } from "./storage";

export interface DocumentationConfig {
  projectId: number;
  projectName: string;
  description: string;
  includeApiDocs: boolean;
  includeUserGuide: boolean;
  includeDeploymentGuide: boolean;
  includeDeveloperGuide: boolean;
}

export interface GeneratedDocumentation {
  apiDocs?: string;
  userGuide?: string;
  deploymentGuide?: string;
  developerGuide?: string;
  combinedUrl?: string;
}

/**
 * Generate comprehensive documentation for a project
 */
export async function generateDocumentation(
  config: DocumentationConfig
): Promise<GeneratedDocumentation> {
  const files = await db.getGeneratedFilesByProjectId(config.projectId);
  const result: GeneratedDocumentation = {};

  // Analyze code structure for documentation
  const backendFiles = files?.filter(f => f.category === "backend") || [];
  const frontendFiles = files?.filter(f => f.category === "frontend") || [];

  if (config.includeApiDocs && backendFiles.length > 0) {
    result.apiDocs = await generateApiDocumentation(config.projectName, backendFiles);
  }

  if (config.includeUserGuide) {
    result.userGuide = await generateUserGuide(config.projectName, config.description);
  }

  if (config.includeDeploymentGuide) {
    result.deploymentGuide = generateDeploymentGuide(config.projectName);
  }

  if (config.includeDeveloperGuide) {
    result.developerGuide = await generateDeveloperGuide(config.projectName, files || []);
  }

  // Combine all documentation
  const combined = combineDocumentation(config.projectName, result);
  
  // Upload to S3
  const timestamp = Date.now();
  const fileKey = `projects/${config.projectId}/docs/documentation-${timestamp}.md`;
  const { url } = await storagePut(
    fileKey,
    Buffer.from(combined, 'utf-8'),
    'text/markdown'
  );
  
  result.combinedUrl = url;

  return result;
}

/**
 * Generate API documentation from backend files
 */
async function generateApiDocumentation(
  projectName: string,
  backendFiles: Array<{ fileName: string; content: string; filePath: string }>
): Promise<string> {
  // Extract API endpoints from code
  const endpointPattern = /@(router|app)\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/gi;
  const endpoints: Array<{ method: string; path: string; file: string }> = [];

  backendFiles.forEach(file => {
    let match;
    while ((match = endpointPattern.exec(file.content)) !== null) {
      endpoints.push({
        method: match[2].toUpperCase(),
        path: match[3],
        file: file.fileName
      });
    }
  });

  // Use LLM to enhance documentation
  const prompt = `Generate API documentation for ${projectName} with these endpoints:
${endpoints.map(e => `- ${e.method} ${e.path} (from ${e.file})`).join('\n')}

Include:
1. Overview
2. Authentication requirements
3. Each endpoint with request/response examples
4. Error codes
5. Rate limiting info`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a technical writer specializing in API documentation." },
      { role: "user", content: prompt }
    ]
  });

  const content = response.choices[0]?.message?.content;
  const llmContent = typeof content === 'string' ? content : '';

  return `# ${projectName} API Documentation

## Overview

This document describes the REST API for ${projectName}.

## Base URL

\`\`\`
http://localhost:8000/api
\`\`\`

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Endpoints

${llmContent}

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per authenticated user
`;
}

/**
 * Generate user guide
 */
async function generateUserGuide(
  projectName: string,
  description: string
): Promise<string> {
  const prompt = `Create a user guide for an application called "${projectName}".
Description: ${description}

Include:
1. Getting started
2. Main features walkthrough
3. Common tasks
4. FAQ
5. Troubleshooting`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a technical writer creating user-friendly documentation." },
      { role: "user", content: prompt }
    ]
  });

  const content = response.choices[0]?.message?.content;
  const llmContent = typeof content === 'string' ? content : '';

  return `# ${projectName} User Guide

## Welcome

Welcome to ${projectName}! This guide will help you get started and make the most of the application.

${llmContent}

## Getting Help

If you need additional assistance:
- Check the FAQ section
- Contact support through the application
- Visit our documentation website
`;
}

/**
 * Generate deployment guide
 */
function generateDeploymentGuide(projectName: string): string {
  return `# ${projectName} Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- Docker and Docker Compose installed
- Access to a cloud provider (AWS, GCP, Azure, or DigitalOcean)
- Domain name (optional but recommended)
- SSL certificate (optional but recommended)

## Deployment Options

### Option 1: Docker Compose (Recommended for Development/Staging)

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd ${projectName.toLowerCase().replace(/\s+/g, '-')}
   \`\`\`

2. **Configure environment variables**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Start the application**
   \`\`\`bash
   docker-compose up -d
   \`\`\`

4. **Verify deployment**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Option 2: Kubernetes (Recommended for Production)

1. **Build and push Docker images**
   \`\`\`bash
   docker build -t your-registry/frontend:latest ./frontend
   docker build -t your-registry/backend:latest ./backend
   docker push your-registry/frontend:latest
   docker push your-registry/backend:latest
   \`\`\`

2. **Apply Kubernetes manifests**
   \`\`\`bash
   kubectl apply -f k8s/
   \`\`\`

3. **Configure ingress and SSL**
   - Set up ingress controller
   - Configure cert-manager for SSL

### Option 3: Cloud Platform Deployment

#### AWS (ECS/Fargate)
1. Create ECR repositories
2. Push Docker images
3. Create ECS cluster and services
4. Configure ALB and Route 53

#### Google Cloud (Cloud Run)
1. Build and push to Container Registry
2. Deploy to Cloud Run
3. Configure custom domain

#### DigitalOcean (App Platform)
1. Connect GitHub repository
2. Configure build settings
3. Deploy application

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| SECRET_KEY | Yes | JWT signing secret |
| API_HOST | No | Backend host (default: 0.0.0.0) |
| API_PORT | No | Backend port (default: 8000) |

## Database Setup

1. **Create PostgreSQL database**
   \`\`\`sql
   CREATE DATABASE ${projectName.toLowerCase().replace(/\s+/g, '_')};
   \`\`\`

2. **Run migrations**
   \`\`\`bash
   cd backend
   alembic upgrade head
   \`\`\`

## SSL Configuration

For production, always use HTTPS:

1. **Using Let's Encrypt with Certbot**
   \`\`\`bash
   certbot --nginx -d yourdomain.com
   \`\`\`

2. **Using Cloudflare**
   - Add domain to Cloudflare
   - Enable Full SSL mode
   - Configure origin certificates

## Monitoring and Logging

### Recommended Tools
- **Logging**: ELK Stack, Papertrail, or CloudWatch
- **Monitoring**: Prometheus + Grafana, Datadog, or New Relic
- **Error Tracking**: Sentry

### Health Checks
- Backend: \`GET /health\`
- Database: Check connection pool status

## Scaling

### Horizontal Scaling
- Use load balancer for multiple backend instances
- Configure session affinity if needed
- Scale database with read replicas

### Vertical Scaling
- Increase container resources as needed
- Monitor memory and CPU usage

## Backup and Recovery

1. **Database Backups**
   \`\`\`bash
   pg_dump -h localhost -U postgres ${projectName.toLowerCase().replace(/\s+/g, '_')} > backup.sql
   \`\`\`

2. **Automated Backups**
   - Configure cloud provider backup policies
   - Set retention period (recommended: 30 days)

## Troubleshooting

### Common Issues

1. **Container won't start**
   - Check logs: \`docker-compose logs\`
   - Verify environment variables
   - Check port conflicts

2. **Database connection failed**
   - Verify DATABASE_URL
   - Check network connectivity
   - Ensure database is running

3. **SSL certificate errors**
   - Verify certificate validity
   - Check certificate chain
   - Ensure correct domain configuration
`;
}

/**
 * Generate developer guide
 */
async function generateDeveloperGuide(
  projectName: string,
  files: Array<{ fileName: string; filePath: string; category: string; fileType: string }>
): Promise<string> {
  // Analyze project structure
  const structure = analyzeProjectStructure(files);

  return `# ${projectName} Developer Guide

## Project Overview

This guide provides information for developers working on ${projectName}.

## Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query for server state
- **Routing**: React Router v6

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens
- **API Documentation**: OpenAPI/Swagger

## Project Structure

\`\`\`
${structure}
\`\`\`

## Development Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Docker (optional)

### Backend Setup

\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload
\`\`\`

### Frontend Setup

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

## Code Style

### TypeScript/React
- Use functional components with hooks
- Follow ESLint configuration
- Use TypeScript strict mode
- Prefer named exports

### Python
- Follow PEP 8 guidelines
- Use type hints
- Document functions with docstrings
- Use async/await for I/O operations

## Testing

### Frontend Tests
\`\`\`bash
npm run test
npm run test:coverage
\`\`\`

### Backend Tests
\`\`\`bash
pytest
pytest --cov=app
\`\`\`

## API Development

### Adding a New Endpoint

1. Create router in \`backend/routers/\`
2. Define Pydantic schemas
3. Implement business logic
4. Add tests
5. Update API documentation

### Example Router

\`\`\`python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/items", tags=["items"])

class ItemCreate(BaseModel):
    name: str
    description: str = None

@router.post("/")
async def create_item(item: ItemCreate):
    # Implementation
    return {"id": 1, **item.dict()}
\`\`\`

## Database

### Migrations

\`\`\`bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
\`\`\`

### Adding a New Model

1. Define model in \`backend/models/\`
2. Create migration
3. Add CRUD operations in \`backend/crud/\`
4. Create Pydantic schemas

## Contributing

1. Create feature branch
2. Make changes
3. Write tests
4. Submit pull request
5. Address review feedback

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
`;
}

/**
 * Analyze project structure from files
 */
function analyzeProjectStructure(
  files: Array<{ fileName: string; filePath: string; category: string }>
): string {
  const structure: Record<string, string[]> = {};
  
  files.forEach(file => {
    const parts = file.filePath.split('/');
    const dir = parts.slice(0, -1).join('/') || '/';
    if (!structure[dir]) {
      structure[dir] = [];
    }
    structure[dir].push(file.fileName);
  });

  let result = '';
  Object.entries(structure).sort().forEach(([dir, fileList]) => {
    result += `${dir}/\n`;
    fileList.forEach(f => {
      result += `  └── ${f}\n`;
    });
  });

  return result || 'No files generated yet';
}

/**
 * Combine all documentation into single document
 */
function combineDocumentation(
  projectName: string,
  docs: GeneratedDocumentation
): string {
  let combined = `# ${projectName} - Complete Documentation

Generated by AppForge on ${new Date().toISOString()}

## Table of Contents

1. [User Guide](#user-guide)
2. [API Documentation](#api-documentation)
3. [Deployment Guide](#deployment-guide)
4. [Developer Guide](#developer-guide)

---

`;

  if (docs.userGuide) {
    combined += `${docs.userGuide}\n\n---\n\n`;
  }

  if (docs.apiDocs) {
    combined += `${docs.apiDocs}\n\n---\n\n`;
  }

  if (docs.deploymentGuide) {
    combined += `${docs.deploymentGuide}\n\n---\n\n`;
  }

  if (docs.developerGuide) {
    combined += `${docs.developerGuide}\n\n`;
  }

  return combined;
}

export default {
  generateDocumentation
};

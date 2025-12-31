/**
 * Code Generation Engine for ADELE
 * Generates production-ready code templates for various application types
 */

import { invokeLLM } from "./_core/llm";

// Template types
export type TechStack = {
  frontend: "react" | "vue" | "nextjs";
  backend: "fastapi" | "express" | "django";
  database: "postgresql" | "mysql" | "mongodb";
  deployment: "docker" | "kubernetes" | "serverless";
};

export type AppType = "saas" | "enterprise" | "ecommerce" | "social" | "dashboard" | "marketplace" | "custom";

export interface GeneratedFile {
  path: string;
  content: string;
  type: "frontend" | "backend" | "database" | "config" | "docs";
  description: string;
}

export interface GenerationResult {
  files: GeneratedFile[];
  dependencies: {
    frontend: string[];
    backend: string[];
  };
  instructions: string;
  dockerConfig?: string;
  envVariables: Record<string, string>;
}

// Base templates for different file types
const TEMPLATES = {
  // React TypeScript Component Template
  reactComponent: (name: string, props: string[] = []) => `import React from 'react';

interface ${name}Props {
${props.map(p => `  ${p}: string;`).join('\n')}
}

export const ${name}: React.FC<${name}Props> = ({ ${props.join(', ')} }) => {
  return (
    <div className="${name.toLowerCase()}-container">
      {/* Component content */}
    </div>
  );
};

export default ${name};
`,

  // FastAPI Endpoint Template
  fastApiEndpoint: (resource: string) => `from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/${resource.toLowerCase()}", tags=["${resource}"])

class ${resource}Base(BaseModel):
    name: str
    description: Optional[str] = None

class ${resource}Create(${resource}Base):
    pass

class ${resource}Response(${resource}Base):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# In-memory storage (replace with database)
${resource.toLowerCase()}_db: List[dict] = []

@router.get("/", response_model=List[${resource}Response])
async def list_${resource.toLowerCase()}s():
    """List all ${resource.toLowerCase()}s"""
    return ${resource.toLowerCase()}_db

@router.post("/", response_model=${resource}Response)
async def create_${resource.toLowerCase()}(item: ${resource}Create):
    """Create a new ${resource.toLowerCase()}"""
    new_item = {
        "id": len(${resource.toLowerCase()}_db) + 1,
        "name": item.name,
        "description": item.description,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    ${resource.toLowerCase()}_db.append(new_item)
    return new_item

@router.get("/{item_id}", response_model=${resource}Response)
async def get_${resource.toLowerCase()}(item_id: int):
    """Get a specific ${resource.toLowerCase()}"""
    for item in ${resource.toLowerCase()}_db:
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail="${resource} not found")

@router.put("/{item_id}", response_model=${resource}Response)
async def update_${resource.toLowerCase()}(item_id: int, item: ${resource}Create):
    """Update a ${resource.toLowerCase()}"""
    for i, existing in enumerate(${resource.toLowerCase()}_db):
        if existing["id"] == item_id:
            ${resource.toLowerCase()}_db[i] = {
                **existing,
                "name": item.name,
                "description": item.description,
                "updated_at": datetime.utcnow(),
            }
            return ${resource.toLowerCase()}_db[i]
    raise HTTPException(status_code=404, detail="${resource} not found")

@router.delete("/{item_id}")
async def delete_${resource.toLowerCase()}(item_id: int):
    """Delete a ${resource.toLowerCase()}"""
    for i, item in enumerate(${resource.toLowerCase()}_db):
        if item["id"] == item_id:
            ${resource.toLowerCase()}_db.pop(i)
            return {"message": "${resource} deleted"}
    raise HTTPException(status_code=404, detail="${resource} not found")
`,

  // Database Schema Template (SQLAlchemy)
  sqlAlchemyModel: (name: string, fields: Array<{ name: string; type: string }>) => `from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class ${name}(Base):
    __tablename__ = "${name.toLowerCase()}s"

    id = Column(Integer, primary_key=True, index=True)
${fields.map(f => `    ${f.name} = Column(${f.type})`).join('\n')}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<${name}(id={self.id})>"
`,

  // Docker Compose Template
  dockerCompose: (appName: string, hasDatabase: boolean) => `version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/${appName.toLowerCase()}
      - SECRET_KEY=\${SECRET_KEY}
    depends_on:
${hasDatabase ? '      - db' : '      []'}

${hasDatabase ? `  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=${appName.toLowerCase()}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:` : ''}
`,

  // Dockerfile for Frontend
  dockerfileFrontend: () => `FROM node:20-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
`,

  // Dockerfile for Backend
  dockerfileBackend: () => `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`,

  // Main FastAPI App
  fastApiMain: (appName: string, routers: string[]) => `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
${routers.map(r => `from routers import ${r}`).join('\n')}

app = FastAPI(
    title="${appName} API",
    description="API for ${appName}",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
${routers.map(r => `app.include_router(${r}.router)`).join('\n')}

@app.get("/")
async def root():
    return {"message": "Welcome to ${appName} API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
`,

  // React App Entry Point
  reactApp: (appName: string) => `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

// Components
import Navbar from './components/Navbar';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Toaster position="bottom-right" />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
`,

  // Package.json for Frontend
  packageJson: (appName: string) => `{
  "name": "${appName.toLowerCase().replace(/\s+/g, '-')}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.0",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.20.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
`,

  // Requirements.txt for Backend
  requirementsTxt: () => `fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pydantic==2.5.2
pydantic-settings==2.1.0
httpx==0.25.2
pytest==7.4.3
pytest-asyncio==0.21.1
`,

  // Environment file template
  envTemplate: (appName: string) => `# ${appName} Environment Variables

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${appName.toLowerCase()}

# Security
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API
API_HOST=0.0.0.0
API_PORT=8000

# Frontend
REACT_APP_API_URL=http://localhost:8000
`,

  // README Template
  readme: (appName: string, description: string) => `# ${appName}

${description}

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python 3.11
- **Database**: PostgreSQL
- **Deployment**: Docker + Docker Compose

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd ${appName.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

2. Set up environment variables:
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

3. Start with Docker Compose:
\`\`\`bash
docker-compose up -d
\`\`\`

Or run locally:

**Backend:**
\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload
\`\`\`

**Frontend:**
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

\`\`\`
${appName.toLowerCase().replace(/\s+/g, '-')}/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── routers/
│   ├── models/
│   ├── schemas/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
└── README.md
\`\`\`

## License

MIT License
`,
};

/**
 * Generate application code based on requirements
 */
export async function generateApplicationCode(
  appName: string,
  description: string,
  appType: AppType,
  requirements: string
): Promise<GenerationResult> {
  // Use LLM to analyze requirements and determine needed components
  const analysisPrompt = `Analyze the following application requirements and determine what components are needed:

Application Name: ${appName}
Description: ${description}
Type: ${appType}
Requirements: ${requirements}

Provide a JSON response with:
{
  "entities": ["list of data entities/models needed"],
  "features": ["list of features to implement"],
  "pages": ["list of frontend pages needed"],
  "apiEndpoints": ["list of API endpoints needed"],
  "authRequired": true/false,
  "paymentRequired": true/false
}`;

  const analysisResponse = await invokeLLM({
    messages: [
      { role: "system", content: "You are an expert software architect. Analyze requirements and provide structured output." },
      { role: "user", content: analysisPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "app_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            entities: { type: "array", items: { type: "string" } },
            features: { type: "array", items: { type: "string" } },
            pages: { type: "array", items: { type: "string" } },
            apiEndpoints: { type: "array", items: { type: "string" } },
            authRequired: { type: "boolean" },
            paymentRequired: { type: "boolean" }
          },
          required: ["entities", "features", "pages", "apiEndpoints", "authRequired", "paymentRequired"],
          additionalProperties: false
        }
      }
    }
  });

  const analysisContent = analysisResponse.choices[0]?.message?.content;
  const analysis = typeof analysisContent === 'string' ? JSON.parse(analysisContent) : {
    entities: ["User", "Item"],
    features: ["CRUD operations"],
    pages: ["Home", "Dashboard"],
    apiEndpoints: ["users", "items"],
    authRequired: true,
    paymentRequired: false
  };

  // Generate files based on analysis
  const files: GeneratedFile[] = [];

  // Generate backend files
  files.push({
    path: "backend/main.py",
    content: TEMPLATES.fastApiMain(appName, analysis.entities.map((e: string) => e.toLowerCase())),
    type: "backend",
    description: "Main FastAPI application entry point"
  });

  files.push({
    path: "backend/requirements.txt",
    content: TEMPLATES.requirementsTxt(),
    type: "backend",
    description: "Python dependencies"
  });

  files.push({
    path: "backend/Dockerfile",
    content: TEMPLATES.dockerfileBackend(),
    type: "config",
    description: "Docker configuration for backend"
  });

  // Generate API routers for each entity
  for (const entity of analysis.entities) {
    files.push({
      path: `backend/routers/${entity.toLowerCase()}.py`,
      content: TEMPLATES.fastApiEndpoint(entity),
      type: "backend",
      description: `API router for ${entity}`
    });
  }

  // Generate frontend files
  files.push({
    path: "frontend/src/App.tsx",
    content: TEMPLATES.reactApp(appName),
    type: "frontend",
    description: "Main React application component"
  });

  files.push({
    path: "frontend/package.json",
    content: TEMPLATES.packageJson(appName),
    type: "frontend",
    description: "Frontend dependencies and scripts"
  });

  files.push({
    path: "frontend/Dockerfile",
    content: TEMPLATES.dockerfileFrontend(),
    type: "config",
    description: "Docker configuration for frontend"
  });

  // Generate React components for each page
  for (const page of analysis.pages) {
    files.push({
      path: `frontend/src/pages/${page}.tsx`,
      content: TEMPLATES.reactComponent(page, []),
      type: "frontend",
      description: `${page} page component`
    });
  }

  // Generate Docker Compose
  files.push({
    path: "docker-compose.yml",
    content: TEMPLATES.dockerCompose(appName, true),
    type: "config",
    description: "Docker Compose configuration"
  });

  // Generate environment template
  files.push({
    path: ".env.example",
    content: TEMPLATES.envTemplate(appName),
    type: "config",
    description: "Environment variables template"
  });

  // Generate README
  files.push({
    path: "README.md",
    content: TEMPLATES.readme(appName, description),
    type: "docs",
    description: "Project documentation"
  });

  return {
    files,
    dependencies: {
      frontend: [
        "react", "react-dom", "react-router-dom",
        "@tanstack/react-query", "axios", "tailwindcss"
      ],
      backend: [
        "fastapi", "uvicorn", "sqlalchemy", "alembic",
        "psycopg2-binary", "python-jose", "passlib"
      ]
    },
    instructions: `
## Generated Application: ${appName}

Your application has been generated with the following structure:
- Frontend: React + TypeScript + Tailwind CSS
- Backend: FastAPI + Python
- Database: PostgreSQL
- Deployment: Docker + Docker Compose

### Next Steps:
1. Review the generated code
2. Customize the components as needed
3. Set up your environment variables
4. Run with Docker Compose or locally

### Features Included:
${analysis.features.map((f: string) => `- ${f}`).join('\n')}

### API Endpoints:
${analysis.apiEndpoints.map((e: string) => `- /${e}`).join('\n')}
`,
    dockerConfig: TEMPLATES.dockerCompose(appName, true),
    envVariables: {
      DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/${appName.toLowerCase()}`,
      SECRET_KEY: "change-this-in-production",
      API_HOST: "0.0.0.0",
      API_PORT: "8000"
    }
  };
}

/**
 * Generate a specific component based on description
 */
export async function generateComponent(
  componentType: "frontend" | "backend" | "database",
  description: string
): Promise<GeneratedFile> {
  const prompt = `Generate a ${componentType} component based on this description:
${description}

Provide production-ready code with proper error handling, types, and documentation.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: `You are an expert ${componentType} developer. Generate clean, production-ready code.` },
      { role: "user", content: prompt }
    ]
  });

  const content = response.choices[0]?.message?.content;
  const code = typeof content === 'string' ? content : '';

  return {
    path: `generated/${componentType}/component.${componentType === 'frontend' ? 'tsx' : 'py'}`,
    content: code,
    type: componentType,
    description
  };
}

export default {
  generateApplicationCode,
  generateComponent,
  TEMPLATES
};

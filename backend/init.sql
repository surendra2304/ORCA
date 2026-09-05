-- Enable pgcrypto for gen_random_uuid() and hashing functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable pgvector for storing embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

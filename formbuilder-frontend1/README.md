<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
-- ============================================
-- 1. Create Database
-- ============================================

CREATE DATABASE formbuilder2;

-- Connect to the new database
\c formbuilder2;


-- ============================================
-- 2. Create Enums for Type Safety
-- ============================================

CREATE TYPE form_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);

CREATE TYPE field_data_type AS ENUM (
    'TEXT',
    'NUMERIC',
    'DATE',
    'BOOLEAN',
    'TEXTAREA'
);


-- ============================================
-- 3. Create the Forms Table
--    (High-level configuration)
-- ============================================

CREATE TABLE forms (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status form_status NOT NULL DEFAULT 'DRAFT',
    target_table_name VARCHAR(64) UNIQUE, -- The prefix for dynamic tables
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- 4. Create Form Versions
--    (To handle schema evolution/rollbacks)
-- ============================================

CREATE TABLE form_versions (
    id BIGSERIAL PRIMARY KEY,
    form_id BIGINT NOT NULL
        REFERENCES forms(id)
        ON DELETE CASCADE,
    version_number INT NOT NULL,
    change_log TEXT, -- Optional: Description of what changed in this version
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Unique version per form
    UNIQUE (form_id, version_number)
);


-- ============================================
-- 5. Create Form Fields
--    (Blueprint for dynamic columns)
-- ============================================

CREATE TABLE form_fields (
    id BIGSERIAL PRIMARY KEY,
    form_version_id BIGINT NOT NULL
        REFERENCES form_versions(id)
        ON DELETE CASCADE,

    -- Label shown to the user (e.g., "First Name")
    field_label VARCHAR(255) NOT NULL,

    -- Actual DB column name (e.g., "first_name")
    -- Application logic must ensure snake_case and SQL safety
    column_name VARCHAR(64) NOT NULL,

    field_type field_data_type NOT NULL,
    is_mandatory BOOLEAN DEFAULT FALSE,

    -- Store validation rules as JSON
    -- Example: {"min": 5, "regex": "^[A-Z]"}
    validation_rules JSONB DEFAULT '{}'::jsonb,

    -- Controls frontend display order
    ordinal_position INT NOT NULL,

    UNIQUE (form_version_id, column_name)
);


-- ============================================
-- 6. Indexes for Performance
-- ============================================

CREATE INDEX idx_forms_status
    ON forms(status);

CREATE INDEX idx_form_fields_version
    ON form_fields(form_version_id);
formbuilder2=# CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX
formbuilder2=# CREATE INDEX idx_form_fields_version ON form_fields(form_version_id);

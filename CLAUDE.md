# SCYLLA Online Store 

## Project Context
Full-stack e-commerce system:
- React (Frontend)
- Node.js + Express (Backend)
- MySQL (Database)

Core features:
- Products, categories, cart, orders
- Stock management
- Role system (Customer, Sales Manager, Product Manager)
- Payment, invoice, refund
- Comments & ratings (approval)
- Search & filtering

## Workflow Orchestration

### 1. Plan First
- Use plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- Break tasks into clear steps before coding
- If something goes wrong → STOP and re-plan
- Think in terms of frontend ↔ backend ↔ database flow

### 2. Focused Execution
- Work step-by-step, do not jump between tasks
- Keep context clean and avoid mixing responsibilities
- For complex tasks, separate concerns (UI / API / DB)

### 3. Self-Improvement
- After any correction → learn the pattern
- Avoid repeating the same mistake
- Adjust approach based on previous errors

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Check UI, API responses, and database consistency
- Ask: "Would this pass a real code review?"
- Ensure nothing else is broken

### 5. Demand Simplicity
- Prefer clean and simple solutions
- Avoid hacky or overly complex implementations
- Do not over-engineer small features

### 6. Autonomous Debugging
- When fixing bugs:
  - Identify root cause
  - Use logs and errors
  - Fix properly, not temporarily
- Do not rely on the user for step-by-step guidance

## Architecture Rules

- Frontend (React): UI and API calls only
- Backend (Node/Express): business logic and validation
- Database (MySQL): data storage

Rules:
- Do NOT mix layers
- Always validate inputs on backend
- Keep APIs clean and RESTful

## UI & Design Rules

- Always use tokens from tokens.css
- Do NOT introduce random colors or styles
- Maintain clean, minimal, beach-style UI
- Keep product cards simple, readable, and consistent

## Business Logic (CRITICAL)

### Stock
- Decrease stock after purchase
- Out-of-stock items:
  - remain visible
  - cannot be added to cart

### Orders
- Must follow: processing → in-transit → delivered

### Pricing
- Discounts must correctly update price
- Do not break original pricing logic

### Refunds
- Only within 30 days
- Refund original paid price (including discount)
- Returned items go back to stock

## Role-Based Access

- Customer → shopping, orders, comments
- Sales Manager → pricing, discounts, invoices
- Product Manager → products, stock, approvals

Rule:
- NEVER mix permissions
- Always enforce roles on backend

## Security Rules

- Hash passwords
- Never expose sensitive data
- Validate all inputs
- Do not trust frontend blindly

## Task Management

1. Plan before coding
2. Implement step-by-step
3. Track progress mentally
4. Keep changes minimal
5. Ensure correctness before finishing

## Definition of Done

A task is complete ONLY if:
- It works correctly
- UI and logic are consistent
- No bugs are introduced
- It follows project structure

## Core Principles

- Simplicity First
- Minimal Impact
- No Temporary Fixes
- Maintain Consistency
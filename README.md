# ACE-HRM API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token. Include the token in the request headers:

```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### Authentication

#### 1. Login

- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

- **Success Response**:

```json
{
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "user": {
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com"
      // ... other profile fields
    },
    "employee": {
      "employeeNumber": "EMP123",
      "jobTitle": "Software Engineer"
      // ... other employee fields
    }
  }
}
```

#### 2. Register

- **URL**: `/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Body**:

```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "jobTitle": "Software Engineer",
  "department": "Engineering",
  "role": "Employee" // Optional, defaults to "Employee"
}
```

- **Success Response**:

```json
{
  "message": "User registered successfully",
  "user": {
    "profile": {
      // User profile data
    },
    "employee": {
      // Employee data
    }
  }
}
```

### Employee Management

#### 1. Get All Employees

- **URL**: `/employees`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `department`: Filter by department
  - `role`: Filter by role
  - `status`: Filter by employment status
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `search`: Search by name or email
- **Success Response**:

```json
{
  "data": [
    {
      "userId": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "employeeNumber": "EMP123",
      "jobTitle": "Software Engineer",
      "department": "Engineering"
      // ... other employee fields
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

#### 2. Get Single Employee

- **URL**: `/employees/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Parameters**: `id` - Employee ID
- **Success Response**:

```json
{
  "userId": {
    // User profile data
  },
  "employeeNumber": "EMP123"
  // ... other employee fields
}
```

#### 3. Update Employee

- **URL**: `/employees/:id`
- **Method**: `PATCH`
- **Auth Required**: Yes (Must be Manager or the employee themselves)
- **URL Parameters**: `id` - Employee ID
- **Body**: Any employee fields to update

```json
{
  "jobTitle": "Senior Software Engineer",
  "department": "Engineering"
}
```

- **Success Response**: Updated employee object

#### 4. Get Team Hierarchy

- **URL**: `/team-hierarchy`
- **Method**: `GET`
- **Auth Required**: Yes (Manager only)
- **Success Response**:

```json
[
  {
    "userId": {
      "firstName": "Team",
      "lastName": "Member",
      "email": "team@example.com"
    },
    "employeeNumber": "EMP124"
    // ... other employee fields
  }
]
```

#### 5. Update Leave Balance

- **URL**: `/employees/:id/leave-balance`
- **Method**: `PATCH`
- **Auth Required**: Yes (Manager only)
- **URL Parameters**: `id` - Employee ID
- **Body**:

```json
{
  "leaveType": "annual",
  "amount": 5,
  "operation": "add" // or "subtract"
}
```

- **Success Response**: Updated employee object

### Time Off Management

#### 1. Create Time Off Request

- **URL**: `/time-offs`
- **Method**: `POST`
- **Auth Required**: Yes
- **Body**:

```json
{
  "timeOffType": "annual",
  "startsAt": "2025-02-01T00:00:00.000Z",
  "endsAt": "2025-02-05T00:00:00.000Z",
  "reason": "Vacation"
}
```

- **Success Response**: Created time off request object

#### 2. Review Time Off Request

- **URL**: `/time-offs/:id/review`
- **Method**: `PATCH`
- **Auth Required**: Yes (Manager only)
- **URL Parameters**: `id` - Time Off request ID
- **Body**:

```json
{
  "status": "Approved", // or "Rejected"
  "reviewNote": "Approved for team vacation"
}
```

- **Success Response**: Updated time off request object

#### 3. Get Time Offs

- **URL**: `/time-offs`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: List of time off requests

#### 4. Get Time Off Statistics

- **URL**: `/time-off-stats`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: Time off statistics data

### Profile Management

#### 1. Get Current User Profile

- **URL**: `/me`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**:

```json
{
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
    // ... other profile fields
  },
  "employee": {
    "employeeNumber": "EMP123",
    "jobTitle": "Software Engineer"
    // ... other employee fields
  }
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "error": "Validation Error",
  "code": "VALIDATION_ERROR",
  "details": {
    // Validation error details
  }
}
```

### 401 Unauthorized

```json
{
  "error": "Please authenticate"
}
```

### 403 Forbidden

```json
{
  "error": "Not authorized"
}
```

### 404 Not Found

```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "code": "INTERNAL_SERVER_ERROR"
}
```

# Team API Documentation

## Base URL
`/api/v1`

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Create Team
Creates a new team in the organization.

**Endpoint:** `POST /teams`  
**Access:** Managers only

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string",
  "organizationHead": "ObjectId",
  "parentTeam": "ObjectId",
  "department": "string (required)",
  "level": "number (required)",
  "members": [{
    "employeeId": "ObjectId (required)",
    "role": "string (required) ['Leader', 'Manager', 'Member']"
  }]
}
```

**Response:** `201 Created`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "organizationHead": "ObjectId",
  "parentTeam": "ObjectId",
  "members": [{
    "employeeId": "ObjectId",
    "role": "string",
    "joinedAt": "Date"
  }],
  "department": "string",
  "level": "number",
  "status": "string",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Get Team Hierarchy
Retrieves the hierarchical structure of a specific team.

**Endpoint:** `GET /teams/:teamId/hierarchy`  
**Access:** All authenticated users

**Response:** `200 OK`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "members": [{
    "employeeId": {
      "userId": {
        "firstName": "string",
        "lastName": "string",
        "email": "string",
        "avatarUrl": "string"
      },
      "jobTitle": "string",
      "role": "string"
    }
  }],
  "subTeams": [
    // Nested team objects with the same structure
  ]
}
```

### Get Organization Hierarchy
Retrieves the complete organizational hierarchy starting from top-level teams.

**Endpoint:** `GET /organization-hierarchy`  
**Access:** All authenticated users

**Response:** `200 OK`
```json
[
  {
    "_id": "ObjectId",
    "name": "string",
    "members": [...],
    "subTeams": [...]
  }
]
```

### Update Team
Updates an existing team's information.

**Endpoint:** `PATCH /teams/:teamId`  
**Access:** Managers only

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "status": "string ['Active', 'Inactive']",
  "department": "string"
}
```

**Response:** `200 OK`
```json
{
  // Updated team object
}
```

### Add Team Member
Adds a new member to a team.

**Endpoint:** `POST /teams/:teamId/members`  
**Access:** Managers only

**Request Body:**
```json
{
  "employeeId": "ObjectId (required)",
  "role": "string (required) ['Leader', 'Manager', 'Member']"
}
```

**Response:** `200 OK`
```json
{
  // Updated team object
}
```

### Remove Team Member
Removes a member from a team.

**Endpoint:** `DELETE /teams/:teamId/members/:employeeId`  
**Access:** Managers only

**Response:** `200 OK`
```json
{
  // Updated team object
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Error message describing the validation failure"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Not authorized"
}
```

### 404 Not Found
```json
{
  "error": "Team not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error message describing the server error"
}
```

# Employee API Documentation

## Base URL
```
/api/v1/employees
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Get All Employees
Retrieves a paginated list of employees with optional filtering.

**GET** `/`

#### Query Parameters
- `role` (optional): Filter by employee role
- `limit` (optional): Number of records per page (default: 10)
- `page` (optional): Page number (default: 1)
- `s` (optional): Search query in encoded JSON format

#### Example Search Query
```
/api/v1/employees?s={"$and":[{"role":{"$eq":"Manager"}}]}
```

#### Response
```typescript
{
    data: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        teamId?: number;
        avatarUrl?: string;
        firstName: string;
        lastName: string;
        jobTitle: string;
        role: string;
        email: string;
        address: string;
        phone: string;
        birthdate?: Date;
        links: string[];
        customFields: Array<{ key: string; value: string }>;
        availableAnnualLeaveDays: number;
    }[];
    total: number;
    page: number;
    totalPages: number;
}
```

#### Status Codes
- `200`: Success
- `500`: Server error

### Get Current Employee Profile
Retrieves the profile of the currently authenticated employee.

**GET** `/me`

#### Response
```typescript
{
    id: number;
    createdAt: Date;
    updatedAt: Date;
    teamId?: number;
    avatarUrl?: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    role: string;
    email: string;
    address: string;
    phone: string;
    birthdate?: Date;
    links: string[];
    customFields: Array<{ key: string; value: string }>;
    availableAnnualLeaveDays: number;
}
```

#### Status Codes
- `200`: Success
- `404`: Profile not found
- `500`: Server error

## Employee Properties

### Employee Object
```typescript
{
    userId: ObjectId;           // Reference to UserProfile
    employeeNumber: string;     // Unique employee identifier
    jobTitle: string;          // Employee's job title
    department: string;        // Department name
    role: "Manager" | "Employee"; // Employee role
    teamId?: ObjectId;         // Reference to Team
    reportsTo?: ObjectId;      // Reference to managing Employee
    dateOfJoining: Date;       // Employment start date
    employmentStatus: "Active" | "OnLeave" | "Terminated"; // Current status
    workLocation: string;      // Work location
    contractType: "FullTime" | "PartTime" | "Contract"; // Employment type
    leaveBalance: {
        annual: number;        // Annual leave days
        sick: number;         // Sick leave days
        casual: number;       // Casual leave days
    };
    compensation: {
        salary: number;       // Salary amount
        currency: string;     // Currency code
        effectiveDate: Date;  // Last salary update date
    };
    documents?: Array<{       // Employee documents
        type: string;
        url: string;
        uploadedAt: Date;
    }>;
    customFields?: Array<{    // Custom field values
        key: string;
        value: string;
    }>;
}
```

## Error Responses

### Generic Error Response
```typescript
{
    error: string;            // Error message
}
```

## Notes
1. All dates are returned in ISO 8601 format
2. `teamId` is converted from MongoDB ObjectId to a numeric ID in responses
3. Employee IDs in responses are derived from the last 8 characters of MongoDB ObjectId
4. The API implements soft deletion - deleted records are marked as inactive rather than removed
5. Custom fields support dynamic attributes that may vary by organization
6. All monetary values in compensation are stored and returned as numbers without currency formatting

## Rate Limiting
- Default rate limit: 100 requests per minute per IP
- Bulk operations: 10 requests per minute per IP

## Pagination
- Default page size: 10 records
- Maximum page size: 100 records
- Page numbers start at 1

## Searching and Filtering
The API supports complex queries through the `s` parameter using MongoDB query syntax. Example search patterns:

```javascript
// Search by role
s={"role":{"$eq":"Manager"}}

// Multiple conditions
s={"$and":[{"role":"Manager"},{"department":"IT"}]}

// Date range
s={"dateOfJoining":{"$gte":"2023-01-01","$lte":"2023-12-31"}}
```

## Best Practices
1. Always implement pagination for large data sets
2. Use appropriate HTTP status codes
3. Include error handling for all requests
4. Cache frequently accessed data
5. Use compression for large responses
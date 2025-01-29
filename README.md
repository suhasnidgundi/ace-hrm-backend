# ACE HRM API Testing Guide

## Base URL

```
http://localhost:3000/api
```

## Authentication Flow

### 1. Register a New User

**POST** `/register`

```json
{
  "email": "john.doe@company.com",
  "password": "securepass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "Manager",
  "jobTitle": "Senior Manager",
  "phone": "123-456-7890",
  "address": "123 Main St"
}
```

### 2. Login

**POST** `/login`

```json
{
  "email": "john.doe@company.com",
  "password": "securepass123"
}
```

Response will include:

- accessToken
- refreshToken
- user details

⚠️ **Important**: Copy the accessToken for subsequent requests

## Setting Up Authorization

For all endpoints below, add header:

```
Authorization: Bearer <your_access_token>
```

## Time Off Management

### 1. Create Time Off Request

**POST** `/time-offs`

```json
{
  "timeOffType": "Annual",
  "startsAt": "2025-02-15T00:00:00.000Z",
  "endsAt": "2025-02-18T00:00:00.000Z",
  "reason": "Family vacation"
}
```

### 2. Get All Time Offs

**GET** `/time-offs`

Different query scenarios:

a) Get Approved Time Offs:

```
/time-offs?s={"$and":[{"status":{"$eq":"Approved"}}]}&limit=10&page=1
```

b) Get Sick Leaves:

```
/time-offs?s={"$and":[{"status":{"$eq":"Approved"}},{"timeOffType":{"$eq":"Sick"}},{"employeeId":{"$eq":"<user_id>"}}]}&limit=1&page=1
```

c) Get Time Off History:

```
/time-offs?s={"$and":[{"status":{"$eq":"Approved"}},{"endsAt":{"$lt":"2025-01-29T19:39:12.347Z"}},{"employeeId":{"$eq":"<user_id>"}}]}&limit=10&page=1
```

d) Get Pending Requests:

```
/time-offs?s={"$and":[{"status":{"$eq":"Pending"}},{"employeeId":{"$eq":"<user_id>"}}]}&limit=10&page=1
```

### 3. Review Time Off Request (Manager Only)

**PATCH** `/time-offs/<time_off_id>/review`

```json
{
  "status": "Approved",
  "reviewNote": "Approved as requested"
}
```

### 4. Get Time Off Statistics

**GET** `/time-off-stats`

Optional query parameter for managers:

```
/time-off-stats?employeeId=<employee_id>
```

## User Management

### 1. Get Current User

**GET** `/me`

### 2. Get Employees

**GET** `/employees`

Different queries:

a) Get All Employees:

```
/employees?s={"$and":[{"role":{"$eq":"Employee"}}]}&limit=4&page=1
```

b) Get All Managers:

```
/employees?s={"$and":[{"role":{"$eq":"Manager"}}]}&limit=3&page=1
```

## Testing Workflow Example

1. Register a manager account
2. Register an employee account
3. Login as employee
4. Create a time off request
5. Login as manager
6. Review the time off request
7. Check updated time off statistics

## Common HTTP Status Codes

- 200: Success
- 201: Created successfully
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

## Testing Tips

1. Save tokens in Postman environment variables
2. Create separate collections for Manager and Employee flows
3. Use different emails for testing different roles
4. Test edge cases:
   - Invalid dates
   - Insufficient leave balance
   - Invalid status transitions
   - Unauthorized access attempts

<h1>Stage Hand BE</h1>

<blockquote>⚠️ <strong>Work in Progress</strong> — this project is currently in active development. Endpoints and data models may change.</blockquote>

<p>A RESTful API for the Stage Hand rehearsal scheduling app, built with Node.js, Express, and PostgreSQL. Allows theatre companies to create productions, manage company members, schedule rehearsals, and track attendance.</p>

<h2>Getting Started</h2>

<h3>Prerequisites</h3>
<ul>
  <li>Node.js v18+</li>
  <li>PostgreSQL</li>
</ul>

<h3>Installation</h3>

<ol>
  <li>
    <p>Clone the repo:</p>
    <pre><code>git clone https://github.com/espiers13/stagehand-be.git
cd stagehand-be</code></pre>
  </li>
  <li>
    <p>Install dependencies:</p>
    <pre><code>npm install</code></pre>
  </li>
  <li>
    <p>Create the following environment files in the root directory:</p>
    <p><strong>.env</strong></p>
    <pre><code>PGDATABASE=stagehand
JWT_SECRET=your_jwt_secret</code></pre>
    <p><strong>.env.test</strong></p>
    <pre><code>PGDATABASE=stagehand_test
JWT_SECRET=your_jwt_secret</code></pre>
  </li>
  <li>
    <p>Set up the databases:</p>
    <pre><code>psql postgres -c "CREATE DATABASE stagehand;"
psql postgres -c "CREATE DATABASE stagehand_test;"</code></pre>
  </li>
  <li>
    <p>Seed the development database:</p>
    <pre><code>npm run seed</code></pre>
  </li>
</ol>

<h2>Running Tests</h2>

<pre><code>npm test</code></pre>

<p>Tests use a separate test database that is re-seeded before each test.</p>

<h2>API Endpoints</h2>

<h3>Auth &amp; User</h3>

<table>
  <thead>
    <tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
  </thead>
  <tbody>
    <tr><td>POST</td><td><code>/api/login</code></td><td>Authenticate user, returns JWT token</td><td>No</td></tr>
    <tr><td>POST</td><td><code>/api/register</code></td><td>Create a new user</td><td>No</td></tr>
    <tr><td>GET</td><td><code>/api/user</code></td><td>Get the logged-in user's details</td><td>Yes</td></tr>
    <tr><td>GET</td><td><code>/api/user/productions</code></td><td>Get all productions for the logged-in user</td><td>Yes</td></tr>
    <tr><td>PATCH</td><td><code>/api/user/password</code></td><td>Change password while logged in</td><td>Yes</td></tr>
    <tr><td>DELETE</td><td><code>/api/user</code></td><td>Delete the logged-in user's account</td><td>Yes</td></tr>
    <tr><td>POST</td><td><code>/api/forgot-password</code></td><td>Request a password reset email</td><td>No</td></tr>
    <tr><td>POST</td><td><code>/api/reset-password</code></td><td>Reset password using a reset token</td><td>No</td></tr>
  </tbody>
</table>

<h3>Productions</h3>

<table>
  <thead>
    <tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
  </thead>
  <tbody>
    <tr><td>POST</td><td><code>/api/productions</code></td><td>Create a new production</td><td>Yes</td></tr>
    <tr><td>GET</td><td><code>/api/productions/:production_id</code></td><td>Get a production by ID</td><td>Yes</td></tr>
    <tr><td>PATCH</td><td><code>/api/productions/:production_id</code></td><td>Edit production details</td><td>Yes</td></tr>
    <tr><td>DELETE</td><td><code>/api/productions/:production_id</code></td><td>Delete a production</td><td>Yes</td></tr>
  </tbody>
</table>

<h3>Company Members</h3>

<table>
  <thead>
    <tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
  </thead>
  <tbody>
    <tr><td>GET</td><td><code>/api/productions/:production_id/members</code></td><td>Get all company members for a production</td><td>Yes</td></tr>
    <tr><td>POST</td><td><code>/api/productions/:production_id/members</code></td><td>Add a company member</td><td>Yes</td></tr>
    <tr><td>DELETE</td><td><code>/api/productions/:production_id/:member_id</code></td><td>Remove a company member</td><td>Yes</td></tr>
  </tbody>
</table>

<h3>Rehearsals</h3>

<table>
  <thead>
    <tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
  </thead>
  <tbody>
    <tr><td>GET</td><td><code>/api/productions/:production_id/rehearsals</code></td><td>Get all rehearsals for a production</td><td>Yes</td></tr>
    <tr><td>POST</td><td><code>/api/productions/:production_id/rehearsals</code></td><td>Add a rehearsal to a production (defaults <code>called</code> to the full company if omitted)</td><td>Yes</td></tr>
    <tr><td>PATCH</td><td><code>/api/productions/:production_id/rehearsals/:rehearsal_id</code></td><td>Edit rehearsal details</td><td>Yes</td></tr>
    <tr><td>DELETE</td><td><code>/api/productions/:production_id/rehearsals/:rehearsal_id</code></td><td>Delete a rehearsal</td><td>Yes</td></tr>
    <tr><td>GET</td><td><code>/api/users/me/schedule</code></td><td>Get all rehearsals the logged-in user is called to</td><td>Yes</td></tr>
  </tbody>
</table>

<h3>Rehearsal Attendance</h3>

<table>
  <thead>
    <tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
  </thead>
  <tbody>
    <tr><td>GET</td><td><code>/api/productions/:production_id/rehearsals/:rehearsal_id/attendance</code></td><td>Get all attendance records for a rehearsal</td><td>Yes (production creator)</td></tr>
    <tr><td>POST</td><td><code>/api/productions/:production_id/rehearsals/:rehearsal_id/attendance</code></td><td>Add a company member to a rehearsal's call</td><td>Yes (production creator)</td></tr>
    <tr><td>DELETE</td><td><code>/api/productions/:production_id/rehearsals/:rehearsal_id/attendance/:user_id</code></td><td>Remove a company member from a rehearsal's call</td><td>Yes (production creator)</td></tr>
    <tr><td>PATCH</td><td><code>/api/productions/:production_id/rehearsals/:rehearsal_id/attendance/:user_id</code></td><td>Confirm or unconfirm your own attendance</td><td>Yes (self only)</td></tr>
  </tbody>
</table>

<h3>Authentication</h3>

<p>Protected routes require a Bearer token in the request header:</p>

<pre><code>Authorization: Bearer &lt;token&gt;</code></pre>

<h2>Request &amp; Response Examples</h2>

<h3>POST /api/login</h3>

<p><strong>Request body:</strong></p>
<pre><code>{
  "email": "your@email.com",
  "password": "your_password"
}</code></pre>

<p><strong>Response:</strong></p>
<pre><code>{
  "user": {
    "id": 1,
    "username": "sarah_director",
    "email": "your@email.com"
  },
  "token": "eyJhbGci..."
}</code></pre>

<h3>POST /api/register</h3>

<p><strong>Request body:</strong></p>
<pre><code>{
  "username": "your_username",
  "email": "your@email.com",
  "password": "your_password"
}</code></pre>

<p><strong>Response:</strong></p>
<pre><code>{
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "your@email.com"
  },
  "token": "eyJhbGci..."
}</code></pre>

<h3>POST /api/productions</h3>

<p><strong>Request body:</strong></p>
<pre><code>{
  "title": "A Midsummer Night's Dream",
  "venue": "The Lowry Studio, Salford",
  "start_date": "2026-09-01",
  "end_date": "2026-09-14"
}</code></pre>

<p><strong>Response:</strong></p>
<pre><code>{
  "id": 1,
  "title": "A Midsummer Night's Dream",
  "created_by": 1,
  "venue": "The Lowry Studio, Salford",
  "start_date": "2026-09-01",
  "end_date": "2026-09-14"
}</code></pre>

<h3>POST /api/productions/:production_id/rehearsals</h3>

<p><strong>Request body:</strong></p>
<pre><code>{
  "date": "2026-08-08",
  "start_time": "10:00",
  "end_time": "17:00",
  "location": "Studio 6, Manchester",
  "notes": "Full run",
  "called": [2, 3, 4]
}</code></pre>

<p><strong>Response:</strong></p>
<pre><code>{
  "id": 5,
  "production_id": 1,
  "date": "2026-08-07T23:00:00.000Z",
  "start_time": "10:00:00",
  "end_time": "17:00:00",
  "location": "Studio 6, Manchester",
  "notes": "Full run",
  "scenes": [],
  "called": [2, 3, 4]
}</code></pre>

<p><em>If <code>called</code> is omitted, it defaults to every company member on the production.</em></p>

<h3>POST /api/productions/:production_id/rehearsals/:rehearsal_id/attendance</h3>

<p><strong>Request body:</strong></p>
<pre><code>{
  "user_id": 4
}</code></pre>

<p><strong>Response:</strong></p>
<pre><code>{
  "rehearsal_id": 2,
  "user_id": 4,
  "confirmed": true
}</code></pre>

<h3>PATCH /api/productions/:production_id/rehearsals/:rehearsal_id/attendance/:user_id</h3>

<p><strong>Request body:</strong></p>
<pre><code>{
  "confirmed": true
}</code></pre>

<p><strong>Response:</strong></p>
<pre><code>{
  "rehearsal_id": 1,
  "user_id": 2,
  "confirmed": true
}</code></pre>

<h2>Tech Stack</h2>

<ul>
  <li><strong>Node.js</strong> &amp; <strong>Express</strong> — server and routing</li>
  <li><strong>PostgreSQL</strong> &amp; <strong>node-postgres (pg)</strong> — database</li>
  <li><strong>bcrypt</strong> — password hashing</li>
  <li><strong>jsonwebtoken</strong> — authentication</li>
  <li><strong>pg-format</strong> — safe SQL query formatting</li>
  <li><strong>resend</strong> &amp; <strong>mailgun.js</strong> — transactional email</li>
  <li><strong>dotenv</strong> — environment variable management</li>
  <li><strong>Jest</strong>, <strong>jest-sorted</strong> &amp; <strong>Supertest</strong> — testing</li>
</ul>

<h2>Scripts</h2>

<table>
  <thead>
    <tr><th>Script</th><th>Command</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td>Start</td><td><code>npm start</code></td><td>Start the server</td></tr>
    <tr><td>Dev</td><td><code>npm run dev</code></td><td>Start with nodemon</td></tr>
    <tr><td>Seed</td><td><code>npm run seed</code></td><td>Seed the development database</td></tr>
    <tr><td>Test</td><td><code>npm test</code></td><td>Run the test suite</td></tr>
  </tbody>
</table>

<h2>Project Structure</h2>

<pre><code>.
├── app.js                                  # Express app: middleware and route definitions
├── listen.js                               # Starts the server
├── db/
│   ├── connection.js                       # Database connection
│   ├── controllers/
│   │   ├── user-controllers.js             # Auth and user account controllers
│   │   ├── production-controllers.js       # Production controllers
│   │   ├── company-member-controllers.js   # Company member controllers
│   │   └── rehearsal-controllers.js        # Rehearsal and attendance controllers
│   ├── models/                             # Database queries
│   ├── middleware/
│   │   └── auth.js                         # JWT verification for protected routes
│   ├── seeds/                              # Seed data and seeding scripts
│   └── utils/                              # Mailer and other utilities
└── __tests__/
    └── app.test.js                         # Endpoint tests (Jest + Supertest)</code></pre>

<h2>Frontend</h2>

<p>The frontend for this project can be found at: <a href="https://github.com/espiers13/stage-hand-app">https://github.com/espiers13/stage-hand-app</a></p>

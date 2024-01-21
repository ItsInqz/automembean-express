const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();

app.use(cors()); // Enable CORS for all routes and origins
app.use(express.json());

// Example route
app.get('/users', async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users)
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

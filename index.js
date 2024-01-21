const express = require("express");
const schedule = require("node-schedule");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");
const { createCronString, loadSchedules } = require("./utils/cron");
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();
const app = express();

app.use(cors()); // Enable CORS for all routes and origins
app.use(express.json());

app.post("/add-schedule/:id", async (req, res) => {
	const { id } = req.params;

	try {
		const scheduleDetails = await prisma.schedule.findUnique({
			where: { id: id },
		});

		if (!scheduleDetails || !scheduleDetails.isActive) {
			return res.status(404).send("Active schedule not found");
		}

		let cronTime;
		if (scheduleDetails.repeat === "daily") {
			cronTime = createCronString(null, scheduleDetails.time);
		} else if (scheduleDetails.repeat === "weekly") {
			cronTime = createCronString(
				scheduleDetails.days,
				scheduleDetails.time
			);
		} else {
			return res.status(400).send("Invalid repeat value");
		}

		const job = schedule.scheduleJob(cronTime, () => {
			console.log(
				`Running job: ${
					scheduleDetails.description || "No description"
				}`
			);
			// Define the task to be performed
		});

		res.status(200).json({
			message: "Schedule added successfully",
			jobId: job.name,
		});
	} catch (error) {
		console.error("Failed to add schedule:", error);
		res.status(500).send("Error adding schedule");
	}
});

app.post("/create-schedule", async (req, res) => {
    const { userId, name, description, repeat, days, time, isActive } = req.body;

    try {
        // Validate input data
        // ...

        // Create a new schedule in the database
        const newSchedule = await prisma.schedule.create({
            data: {
                userId,
                name,
                description,
                repeat,
                days,
                time,
                isActive
            }
        });

        res.status(201).json(newSchedule);
    } catch (error) {
        console.error("Failed to create schedule:", error);
        res.status(500).send("Error creating schedule");
    }
});

loadSchedules()

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

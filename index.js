const express = require("express");
const schedule = require("node-schedule");
const { PrismaClient } = require("@prisma/client");
const Docker = require("dockerode");
const cors = require("cors");
const {
	loadSchedules,
	loadSingleSchedule,
	cancelSchedule,
	modifySchedule,
	jobMap,
} = require("./utils/schedule");
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();
const app = express();

app.use(cors()); // Enable CORS for all routes and origins
app.use(express.json());

const client = new Docker({ socketPath: "/var/run/docker.sock" });
const IMAGE_NAME = "nateloeffel/membean_bot:latest";

// Start Container Endpoint
app.post("/start-container", async (req, res) => {
	try {
		const authkey = req.body.authkey;
		console.log(authkey);
		if (!authkey) {
			return res.status(400).json({ message: "authkey is required" });
		}

		const environmentVars = { AUTHKEY: authkey, PYTHONUNBUFFERED: 1 };

		const container = await client.createContainer({
			Image: IMAGE_NAME,
			Detach: true,
			Env: Object.entries(environmentVars).map(
				([key, value]) => `${key}=${value}`
			),
			HostConfig: { AutoRemove: true },
		});
		await container.start();

		res.status(200).json({
			message: "Container started",
			container_id: container.id,
		});
	} catch (error) {
		res.status(500).json({
			message: "Error starting container",
			error: error.message,
		});
	}
});

// Stop Container Endpoint
app.delete("/stop-container/:container_id", async (req, res) => {
	try {
		const containerId = req.params.container_id;
		const container = client.getContainer(containerId);
		await container.stop();
		await container.remove();

		res.status(200).json({ message: "Container stopped and removed" });
	} catch (error) {
		res.status(500).json({
			message: "Error stopping container",
			error: error.message,
		});
	}
});

app.post("/create-schedule", async (req, res) => {
	const { userId, name, description, repeat, days, time, isActive } =
		req.body;

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
				isActive,
			},
		});

		// Load this new schedule into node-schedule
		const job = loadSingleSchedule(newSchedule, client);

		res.status(201).json({
			message: "Schedule created and loaded successfully",
			schedule: newSchedule,
		});
	} catch (error) {
		console.error("Failed to create schedule:", error);
		res.status(500).send("Error creating schedule");
	}
});

app.put("/modify-schedule/:id", async (req, res) => {
	const scheduleId = req.params.id;
	const { name, description, repeat, days, time, isActive } = req.body;

	try {
		// Update the schedule in the database
		const updatedSchedule = await prisma.schedule.update({
			where: { id: scheduleId },
			data: { name, description, repeat, days, time, isActive },
		});

		// Update the schedule job if it's active, or cancel it if not
		if (isActive) {
			modifySchedule(updatedSchedule, client);
		} else if (jobMap[scheduleId]) {
			cancelSchedule(scheduleId);
		}

		res.status(200).json({
			message: "Schedule updated successfully",
			schedule: updatedSchedule,
		});
	} catch (error) {
		console.error("Failed to modify schedule:", error);
		res.status(500).send("Error modifying schedule");
	}
});

app.delete("/delete-schedule/:id", async (req, res) => {
	const scheduleId = req.params.id;

	try {
		// Cancel the schedule job if it exists
		if (jobMap[scheduleId]) {
			cancelSchedule(scheduleId);
		}

		// Delete the schedule from the database
		await prisma.schedule.delete({
			where: { id: scheduleId },
		});

		res.status(200).json({
			message: "Schedule deleted successfully",
		});
	} catch (error) {
		console.error("Failed to delete schedule:", error);
		res.status(500).send("Error deleting schedule");
	}
});

app.listen(PORT, () => {
	loadSchedules(client);

	console.log(`Server is running on port ${PORT}`);
});

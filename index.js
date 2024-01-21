const express = require("express");
const schedule = require("node-schedule");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");
const {
	loadSchedules,
	loadSingleSchedule,
    cancelSchedule,
    modifySchedule,
    jobMap
} = require("./utils/schedule");
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();
const app = express();

app.use(cors()); // Enable CORS for all routes and origins
app.use(express.json());

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
		const job = loadSingleSchedule(newSchedule);

		res.status(201).json({
			message: "Schedule created and loaded successfully",
			schedule: newSchedule,
			jobId: job.name,
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
            data: { name, description, repeat, days, time, isActive }
        });

        // Update the schedule job if it's active, or cancel it if not
        if (isActive) {
            modifySchedule(updatedSchedule);
        } else if (jobMap[scheduleId]) {
            cancelSchedule(scheduleId);
        }

        res.status(200).json({
            message: "Schedule updated successfully",
            schedule: updatedSchedule
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
            where: { id: scheduleId }
        });

        res.status(200).json({
            message: "Schedule deleted successfully"
        });
    } catch (error) {
        console.error("Failed to delete schedule:", error);
        res.status(500).send("Error deleting schedule");
    }
});


app.listen(PORT, () => {
    loadSchedules();

	console.log(`Server is running on port ${PORT}`);
});

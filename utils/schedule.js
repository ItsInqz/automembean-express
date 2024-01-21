const { PrismaClient } = require("@prisma/client");
const { createCronString } = require("./cron.js");
const prisma = new PrismaClient();
const schedule = require("node-schedule");
const IMAGE_NAME = "nateloeffel/membean_bot:latest";
const jobMap = {};

async function loadSchedules(client) {
	try {
		const schedules = await prisma.schedule.findMany({
			where: { isActive: true },
		});

		schedules.forEach((sch) => {
			let cronTime;
			if (sch.repeat === "daily") {
				cronTime = createCronString(null, sch.time);
			} else if (sch.repeat === "weekly") {
				cronTime = createCronString(sch.days, sch.time);
			} else {
				console.error("Invalid repeat value for schedule:", sch.id);
				return;
			}

			const job = schedule.scheduleJob(cronTime, async () => {
				console.log(
					`Running scheduled job: ${
						sch.description || "No description"
					}`
				);
				try {
					const ak = await prisma.authkey.create({
						data: {
							userid: sch.userId,
						},
					});
					const authkey = ak.id
					const environmentVars = {
						AUTHKEY: authkey,
						PYTHONUNBUFFERED: 1,
					};

					const container = await client.createContainer({
						Image: IMAGE_NAME,
						Detach: true,
						Env: Object.entries(environmentVars).map(
							([key, value]) => `${key}=${value}`
						),
						HostConfig: { AutoRemove: true },
					});
					await container.start();
					console.log(container.id);
				} catch (error) {
					res.status(500).json({
						message: "Error starting container",
						error: error.message,
					});
				}
				// Define the task to be performed for each schedule
			});
			jobMap[sch.id] = job;
		});

		console.log(`Loaded ${schedules.length} schedules.`);
	} catch (error) {
		console.error("Error loading schedules:", error);
	}
}

function loadSingleSchedule(scheduleDetails, client) {
	let cronTime;
	if (scheduleDetails.repeat === "daily") {
		cronTime = createCronString(null, scheduleDetails.time);
	} else if (scheduleDetails.repeat === "weekly") {
		cronTime = createCronString(scheduleDetails.days, scheduleDetails.time);
	} else {
		throw new Error("Invalid repeat value");
	}

	const job = schedule.scheduleJob(cronTime, async () => {
		console.log(
			`Running job: ${scheduleDetails.description || "No description"}`
		);
		const ak = await prisma.authkey.create({
			data: {
				userid: scheduleDetails.userId,
			},
		});
		const authkey = ak.id
		const environmentVars = {
			AUTHKEY: authkey,
			PYTHONUNBUFFERED: 1,
		};

		const container = await client.createContainer({
			Image: IMAGE_NAME,
			Detach: true,
			Env: Object.entries(environmentVars).map(
				([key, value]) => `${key}=${value}`
			),
			HostConfig: { AutoRemove: true },
		});
		await container.start();
		// Define the task to be performed
	});
	jobMap[scheduleDetails.id] = job;
	console.log("JOB SCHEDULED - ", jobMap[scheduleDetails.id]);
	return job;
}

async function modifySchedule(newDetails, client) {
	// Cancel the current job
	if (jobMap[newDetails.id]) {
		cancelSchedule(newDetails.id);
	}

	// Load the updated schedule as a new job
	const updatedJob = loadSingleSchedule(newDetails, client);
}

function cancelSchedule(scheduleId) {
	if (jobMap[scheduleId]) {
		jobMap[scheduleId].cancel();
		delete jobMap[scheduleId]; // Remove the mapping
	}
	console.log("job cancelled");
}

module.exports = {
	loadSchedules,
	loadSingleSchedule,
	cancelSchedule,
	modifySchedule,
	jobMap,
};

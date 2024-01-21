const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const schedule = require("node-schedule");

function createCronString(days, time) {
	const [hour, minute] = time.split(":").map((num) => parseInt(num, 10));
	const daysOfWeek = {
		Sunday: 0,
		Monday: 1,
		Tuesday: 2,
		Wednesday: 3,
		Thursday: 4,
		Friday: 5,
		Saturday: 6,
	};
	let cronDays = days
		? days
				.split(",")
				.map((day) => daysOfWeek[day.trim()])
				.join(",")
		: "*";
	return `${minute} ${hour} * * ${cronDays}`;
}

async function loadSchedules() {
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

			schedule.scheduleJob(cronTime, () => {
				console.log(
					`Running scheduled job: ${
						sch.description || "No description"
					}`
				);
				// Define the task to be performed for each schedule
			});
		});

		console.log(`Loaded ${schedules.length} schedules.`);
	} catch (error) {
		console.error("Error loading schedules:", error);
	}
}

function loadSingleSchedule(scheduleDetails) {
  let cronTime;
  if (scheduleDetails.repeat === "daily") {
      cronTime = createCronString(null, scheduleDetails.time);
  } else if (scheduleDetails.repeat === "weekly") {
      cronTime = createCronString(scheduleDetails.days, scheduleDetails.time);
  } else {
      throw new Error("Invalid repeat value");
  }

  const job = schedule.scheduleJob(cronTime, () => {
      console.log(`Running job: ${scheduleDetails.description || "No description"}`);
      // Define the task to be performed
  });

  return job;
}

module.exports = {
	createCronString,
	loadSchedules,
  loadSingleSchedule
};
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



module.exports = {
	createCronString
};

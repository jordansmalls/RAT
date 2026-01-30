export const formatDayOfWeek = function (date) {
    return new Date(date).toLocaleDateString("en-US", { weekday: "long" });
};

export const formatTimeOfDay = function (date) {
    return new Date(date).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

export const formatDateClicked = function (date) {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

export const formatFullDateClicked = function (date) {
    const d = new Date(date);
    const dayOfWeek = formatDayOfWeek(d);
    const month = d.toLocaleString("en-US", { month: "long" });
    const day = d.getDate();
    const year = d.getFullYear();
    const timeOfDay = formatTimeOfDay(d);

    const suffix = ["st", "nd", "rd", "th"][
        day % 10 > 3 || Math.floor((day % 100) / 10) === 1 ? 3 : (day % 10) - 1
    ];

    return `${dayOfWeek}, ${month} ${day}${suffix} ${year}, at ${timeOfDay}`;
};

console.log(formatFullDateClicked("2026-01-30T00:01:25.005+00:00"));

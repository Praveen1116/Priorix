export function getReminderOffsets(priority: string): number[] {
    switch (priority) {
        case "P1":
            return [120, 60, 30, 10, 5, 1];

        case "P2":
            return [60, 30, 10, 5];

        case "P3":
            return [30, 10];

        case "P4":
            return [10];

        case "P5":
            return[5];

        default:
            return [];
    }
}

export function generateReminderTimes(
    taskTime: Date,
    offsets: number[]
): Date[] {
    const now = new Date();

    return offsets
    .map((minutes) => {
        const reminderTime = new Date(taskTime.getTime() - minutes * 60000);
        return reminderTime;
    })
    .filter((time) => time > now);
}
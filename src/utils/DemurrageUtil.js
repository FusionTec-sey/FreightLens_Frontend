export const calculateDemurrage = ({ ExcludeDayBitmask, ArrivalDate, FreeDay }) => {
    try {
        if (!ArrivalDate || FreeDay === null || FreeDay === undefined) return "";

        const DAY_TO_BIT = {
            0: 64, // Sunday
            1: 1,
            2: 2,
            3: 4,
            4: 8,
            5: 16,
            6: 32  // Saturday
        };

        const arrival = new Date(ArrivalDate);
        let due = new Date(arrival);
        let daysAdded = 0;

        // Loop until we add the required number of working days
        while (daysAdded < FreeDay) {
            const dayOfWeek = due.getDay();
            const bit = DAY_TO_BIT[dayOfWeek];

            if ((ExcludeDayBitmask & bit) === 0) {
                daysAdded++;
            }

            if (daysAdded < FreeDay) {
                due.setDate(due.getDate() + 1);
            }
        }

        const now = new Date();
        const diffInMs = due - now;
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        if (diffInDays > 0) {
            return `Remaining time: ${diffInDays.toFixed(0)} day(s)`;
        } else if (diffInDays < 0) {
            return `Overdue by: ${Math.abs(diffInDays).toFixed(0)} day(s)`;
        } else {
            return `Remaining time: 0.00 day(s)`;
        }
    } catch (error) {
        console.error("Error calculating demurrage:", error);
        return "";
    }
};

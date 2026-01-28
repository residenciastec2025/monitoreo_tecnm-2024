export function getDateAndTime() {
    const now = new Date();

    return {
        fecha: now.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }),
        hora: now.toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })
    };
}

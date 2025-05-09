export const convertDateTime = (date: string, withTime: boolean = false): string => {
    const day = date.split("T")[0].split("-").at(-1);
    const month = date.split("T")[0].split("-").at(1);
    const year = date.split("T")[0].split("-").at(0);
    if (withTime) return `${date.split("T")[1].slice(0, -3)} ${day}.${month}.${year}`
    return `${day}.${month}.${year}`;
}

export const validateData = (data: string, field: "username" | "email" | "phone" | "password" | "datetime"): boolean => {

    enum getRegExp {
        username = `/^[a-zA-Zа-яА-ЯёЁ0-9_-]{3,20}$/`,
        email = `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/`,
        phone = `/^\\+[0-9]{10,15}$/`,
        password = `/^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$/`
    }

    if (field !== "datetime") {
        const curRegExp = new RegExp(getRegExp[field])
        return curRegExp.test(data);
    }

    const now = new Date();
    const minDate = new Date(now.getTime() + 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    try {
        return (
            new Date(data)
            && new Date(data) >= minDate
            && new Date(data) <= maxDate
        )
    } catch (error) {
        return true;
    }
}
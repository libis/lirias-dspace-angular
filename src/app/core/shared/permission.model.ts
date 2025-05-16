export interface Permission {
    permission: string,
    endDate: {
        year: null | number,
        month: null | number,
        day: null | number
    } | null
}
export interface Permission {
    permission: string,
    embargoEndDate: {
        year: null | number,
        month: null | number,
        day: null | number
    } | null
}

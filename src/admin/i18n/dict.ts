/**
 * Ruscha resurs fayli tipi: o'zbekcha manba (`as const`) bilan bir xil tuzilma, qiymatlari — istalgan satr.
 * Kalit tushib qolsa yoki ortiqcha bo'lsa lint yiqiladi (`src/locales.ts` bilan bir xil kafolat).
 */
export type Dict<T> = { [K in keyof T]: T[K] extends string ? string : Dict<T[K]> };

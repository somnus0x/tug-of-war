const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/

const CID_V1_BASE32 = /^b[a-z2-7]{50,}$/

export const isCid = (text: string): boolean => CID_V0.test(text) || CID_V1_BASE32.test(text)

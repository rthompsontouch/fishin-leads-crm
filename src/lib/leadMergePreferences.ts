const KEY = 'crm-auto-merge-matching-leads'

export function getAutoMergeMatchingLeads(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setAutoMergeMatchingLeads(value: boolean) {
  try {
    window.localStorage.setItem(KEY, value ? '1' : '0')
  } catch {
    // ignore
  }
}

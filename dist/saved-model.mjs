export function remainingSavedCards(cards,transactions,userId){const helped=new Set((transactions||[]).filter(t=>t.supporterId===userId&&['succeeded','completed'].includes(t.status)).map(t=>t.cardId));return cards.filter(card=>!helped.has(card.id));}
export const savedIdsKey=id=>'debtfreelately-saved-cards:'+id;
export const savedPreviewsKey=id=>'debtfreelately-saved-previews:'+id;

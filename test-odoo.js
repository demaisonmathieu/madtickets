// Test rapide pour vérifier que les fonctions existent
import { odooService } from './src/services/odoo.ts'

console.log('createTimeEntry:', typeof odooService.createTimeEntry)
console.log('getTicketTimeEntries:', typeof odooService.getTicketTimeEntries)
console.log('syncTimeEntry:', typeof odooService.syncTimeEntry)
console.log('searchPartners:', typeof odooService.searchPartners)
console.log('isConfigured:', typeof odooService.isConfigured)

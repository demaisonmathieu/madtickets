<template>
  <div class="container mt-4">
    <h2>💾 Sauvegarde & Restauration</h2>
    
    <div class="card mt-4">
      <div class="card-body">
        <h5 class="card-title">📤 Exporter les données</h5>
        <p class="card-text">
          Téléchargez une sauvegarde complète de toutes vos données (projets, tickets, sprints, todos, temps).
        </p>
        <button class="btn btn-primary" @click="exportData">
          📥 Télécharger la sauvegarde
        </button>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-body">
        <h5 class="card-title">📥 Importer les données</h5>
        <p class="card-text">
          Restaurez vos données depuis un fichier de sauvegarde.
        </p>
        
        <div class="mb-3">
          <label class="form-label">Mode d'importation :</label>
          <div class="form-check">
            <input 
              class="form-check-input" 
              type="radio" 
              name="importMode" 
              id="modeMerge" 
              value="merge" 
              v-model="importMode"
            >
            <label class="form-check-label" for="modeMerge">
              <strong>Fusionner</strong> - Ajouter les nouvelles données sans supprimer les existantes
            </label>
          </div>
          <div class="form-check">
            <input 
              class="form-check-input" 
              type="radio" 
              name="importMode" 
              id="modeReplace" 
              value="replace" 
              v-model="importMode"
            >
            <label class="form-check-label" for="modeReplace">
              <strong>Remplacer</strong> - Supprimer toutes les données existantes et importer
            </label>
          </div>
        </div>

        <input 
          type="file" 
          ref="fileInput" 
          accept=".json" 
          @change="handleFileSelect" 
          class="form-control mb-3"
        >
        
        <button 
          class="btn btn-warning" 
          @click="importData" 
          :disabled="!selectedFile"
        >
          📤 Importer depuis le fichier
        </button>
      </div>
    </div>

    <div v-if="statusMessage" class="alert mt-4" :class="statusClass">
      {{ statusMessage }}
    </div>

    <div class="card mt-4">
      <div class="card-body">
        <h5 class="card-title">ℹ️ Informations</h5>
        <ul>
          <li><strong>Format :</strong> Fichier JSON avec toutes vos données</li>
          <li><strong>Fusion :</strong> Conserve les données existantes, ajoute les nouvelles</li>
          <li><strong>Remplacement :</strong> Supprime tout et restaure depuis la sauvegarde</li>
          <li><strong>⚠️ Attention :</strong> En mode "Remplacer", toutes vos données actuelles seront perdues</li>
          <li><strong>Odoo :</strong> Les liens avec Odoo (odooId) sont préservés</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { db } from '../services/database-new';

export default {
  name: 'DataManagement',
  setup() {
    const fileInput = ref(null);
    const selectedFile = ref(null);
    const importMode = ref('merge');
    const statusMessage = ref('');
    const statusClass = ref('');

    const exportData = async () => {
      try {
        statusMessage.value = 'Export en cours...';
        statusClass.value = 'alert-info';

        const jsonData = await db.exportDatabase();
        
        // Créer un blob et télécharger
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Nom du fichier avec date
        const date = new Date().toISOString().split('T')[0];
        a.download = `tickets-backup-${date}.json`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        statusMessage.value = '✅ Export réussi ! Le fichier a été téléchargé.';
        statusClass.value = 'alert-success';
        
        setTimeout(() => {
          statusMessage.value = '';
        }, 5000);
      } catch (error) {
        console.error('Erreur export:', error);
        statusMessage.value = '❌ Erreur lors de l\'export : ' + error.message;
        statusClass.value = 'alert-danger';
      }
    };

    const handleFileSelect = (event) => {
      selectedFile.value = event.target.files[0];
      statusMessage.value = '';
    };

    const importData = async () => {
      if (!selectedFile.value) {
        statusMessage.value = '⚠️ Veuillez sélectionner un fichier';
        statusClass.value = 'alert-warning';
        return;
      }

      const confirmMsg = importMode.value === 'replace'
        ? '⚠️ ATTENTION : Cette action va SUPPRIMER toutes vos données actuelles et les remplacer par celles du fichier. Continuer ?'
        : 'Importer les données du fichier ? Les données existantes seront conservées.';

      if (!confirm(confirmMsg)) {
        return;
      }

      try {
        statusMessage.value = 'Import en cours...';
        statusClass.value = 'alert-info';

        const text = await selectedFile.value.text();
        await db.importDatabase(text, importMode.value === 'replace');

        statusMessage.value = '✅ Import réussi ! Les données ont été restaurées.';
        statusClass.value = 'alert-success';

        // Réinitialiser le formulaire
        selectedFile.value = null;
        if (fileInput.value) {
          fileInput.value.value = '';
        }

        // Recharger la page après 2 secondes pour rafraîchir toutes les vues
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        console.error('Erreur import:', error);
        statusMessage.value = '❌ Erreur lors de l\'import : ' + error.message;
        statusClass.value = 'alert-danger';
      }
    };

    return {
      fileInput,
      selectedFile,
      importMode,
      statusMessage,
      statusClass,
      exportData,
      handleFileSelect,
      importData
    };
  }
};
</script>

<style scoped>
.card {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-title {
  color: #333;
  margin-bottom: 1rem;
}

.form-check {
  padding: 0.5rem 0;
}

.alert {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

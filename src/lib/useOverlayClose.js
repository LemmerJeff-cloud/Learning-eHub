import { useRef } from 'react'

// Ferme la modale seulement si le mousedown ET le click ont eu lieu directement sur l'overlay.
// Un simple onClick avec `e.target === overlay` se déclenche aussi quand on sélectionne du texte
// à la souris dans un champ et qu'on relâche le bouton en dehors de la boîte modale (le clic de
// fin de sélection remonte alors jusqu'à l'overlay) — la modale se fermait donc par erreur.
export function useOverlayClose(onClose) {
  const downOnOverlay = useRef(false)
  return {
    onMouseDown: e => { downOnOverlay.current = e.target === e.currentTarget },
    onClick: e => { if (downOnOverlay.current && e.target === e.currentTarget) onClose?.() },
  }
}

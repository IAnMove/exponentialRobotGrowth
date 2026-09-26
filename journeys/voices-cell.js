// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "step-0",
      "title": "1 · La información queda en el núcleo",
      "text": "En esta célula eucariota, el ADN contiene instrucciones que pueden copiarse a ARN. La transcripción produce una molécula de ARN a partir de una región del ADN. Ampliamos solo un fragmento inventado para seguirlo con claridad: no representa un gen humano completo.",
      "file": "journey-cell-es-step-0-3bb3efe52686.mp3",
      "duration": 17.352
    },
    {
      "id": "step-1",
      "title": "2 · Sale una copia, no el ADN",
      "text": "Después de su procesamiento, el ARN mensajero puede salir del núcleo a través de poros. Aquí mostramos cinco codones: grupos de tres letras. Cambia la variante: UUU y UUC codifican el mismo aminoácido; UAA es una señal de parada. No todos los cambios de ADN alteran una proteína.",
      "file": "journey-cell-es-step-1-309960b9bfca.mp3",
      "duration": 22.032
    },
    {
      "id": "step-2",
      "title": "3 · El ribosoma lee tripletes",
      "text": "El ribosoma avanza por el mensajero. Los ARN de transferencia ayudan a incorporar los aminoácidos correspondientes, formando una cadena. Pulsa reproducir para seguir cada codón. En este ejemplo AUG inicia la traducción; cuando llega una señal de parada, la cadena se libera.",
      "file": "journey-cell-es-step-2-c2c096f924f5.mp3",
      "duration": 19.98
    },
    {
      "id": "step-3",
      "title": "4 · La cadena debe funcionar",
      "text": "Una proteína necesita plegarse y puede requerir modificaciones y transporte. El retículo y el aparato de Golgi intervienen en determinadas rutas, no en todas las proteínas. Las mitocondrias contribuyen a producir ATP para procesos celulares. Nuestra cadena corta es una demostración del código genético, no una proteína funcional.",
      "file": "journey-cell-es-step-3-26e3c6d506d3.mp3",
      "duration": 20.664
    }
  ],
  "en": [
    {
      "id": "step-0",
      "title": "1 · Information stays in the nucleus",
      "text": "In this eukaryotic cell, DNA contains instructions that can be copied into RNA. Transcription produces an RNA molecule from a region of DNA. We enlarge a short invented fragment so we can follow it clearly: it does not represent a complete human gene.",
      "file": "journey-cell-en-step-0-42bd7fca5a2f.mp3",
      "duration": 17.352
    },
    {
      "id": "step-1",
      "title": "2 · A copy leaves, not the DNA",
      "text": "After processing, messenger RNA can leave the nucleus through pores. Here we show five codons: groups of three letters. Change the variant: UUU and UUC encode the same amino acid; UAA signals a stop. Not every DNA change alters a protein.",
      "file": "journey-cell-en-step-1-8255affaa4e3.mp3",
      "duration": 19.116
    },
    {
      "id": "step-2",
      "title": "3 · The ribosome reads triplets",
      "text": "The ribosome moves along the messenger. Transfer RNAs help add the corresponding amino acids, forming a chain. Press play to follow each codon. In this example AUG starts translation; when a stop signal arrives, the chain is released.",
      "file": "journey-cell-en-step-2-d13dbb6eaa4e.mp3",
      "duration": 16.308
    },
    {
      "id": "step-3",
      "title": "4 · The chain must work",
      "text": "A protein must fold and may need modification and transport. The endoplasmic reticulum and Golgi apparatus participate in certain routes, not in every protein’s journey. Mitochondria help produce ATP for cellular processes. Our short chain demonstrates the genetic code; it is not a functional protein.",
      "file": "journey-cell-en-step-3-84b06b59a679.mp3",
      "duration": 20.808
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;

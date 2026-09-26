// Recorded with MiniMax speech-2.8-hd. No credentials are shipped.
export const VOICES = {
  "es": [
    {
      "id": "step-0",
      "title": "1 · Alguien comparte",
      "text": "Una persona conoce una idea y la transmite a sus contactos. Cada persona recién alcanzada tiene una sola ronda para intentar transmitirla. La probabilidad es un control del experimento, no una medida del comportamiento humano. Amarillo significa activo; verde, alcanzado anteriormente; gris, todavía no alcanzado.",
      "file": "journey-ideas-es-step-0-ddeaf41c1bc3.mp3",
      "duration": 21.744
    },
    {
      "id": "step-1",
      "title": "2 · Una red puede multiplicar",
      "text": "Si varias personas alcanzan a otras nuevas, las primeras rondas pueden crecer deprisa. Pero los contactos se repiten y muchos ya conocen la idea. Compara la curva verde con una referencia lineal que añade dos personas por ronda. No toda difusión crece exponencialmente, ni puede hacerlo para siempre.",
      "file": "journey-ideas-es-step-1-7b0e3f8eb999.mp3",
      "duration": 19.116
    },
    {
      "id": "step-2",
      "title": "3 · Cruzar una comunidad",
      "text": "Estos cuatro grupos tienen conexiones internas y unos pocos puentes. Desactívalos: la idea queda encerrada en el primer grupo, aunque aumentes la probabilidad. La estructura de la red importa tanto como la facilidad de compartir. Un puente ofrece una oportunidad, no garantiza que el mensaje cruce.",
      "file": "journey-ideas-es-step-2-fd001cf2e00e.mp3",
      "duration": 20.124
    },
    {
      "id": "step-3",
      "title": "4 · Saturación o extinción",
      "text": "El contador nunca supera las sesenta y cuatro personas de esta red. La difusión termina cuando no quedan emisores activos, incluso si algunas personas no recibieron nada. Este modelo describe contactos y transmisión; no mide verdad, persuasión, calidad ni la recomendación de una plataforma.",
      "file": "journey-ideas-es-step-3-d53180f1df23.mp3",
      "duration": 17.532
    }
  ],
  "en": [
    {
      "id": "step-0",
      "title": "1 · Someone shares",
      "text": "One person knows an idea and shares it with contacts. Each newly reached person has one round to attempt transmission. Probability is an experimental control, not a measurement of human behaviour. Yellow means active; green means reached earlier; grey means not yet reached.",
      "file": "journey-ideas-en-step-0-56c458be5ccd.mp3",
      "duration": 17.712
    },
    {
      "id": "step-1",
      "title": "2 · A network can multiply",
      "text": "When several people reach new people, early rounds can grow quickly. But contacts overlap and many already know the idea. Compare the green curve with a linear reference adding two people per round. Not every diffusion process grows exponentially, and none can do so forever in a finite population.",
      "file": "journey-ideas-en-step-1-3e4d7ad02a67.mp3",
      "duration": 19.008
    },
    {
      "id": "step-2",
      "title": "3 · Crossing a community",
      "text": "These four groups have internal connections and a few bridges. Disable them: the idea stays in the first group even if you raise the probability. Network structure matters as much as ease of sharing. A bridge offers an opportunity; it does not guarantee that the message crosses.",
      "file": "journey-ideas-en-step-2-7d863524b75d.mp3",
      "duration": 18.072
    },
    {
      "id": "step-3",
      "title": "4 · Saturation or extinction",
      "text": "The counter never exceeds this network’s sixty-four people. Diffusion ends when no active senders remain, even if some people received nothing. This model describes contacts and transmission; it does not measure truth, persuasion, quality or a platform’s recommendation system.",
      "file": "journey-ideas-en-step-3-4c07a7019f1b.mp3",
      "duration": 18.108
    }
  ]
};
const base = new URL(document.documentElement.lang === 'es' ? '../../audio/' : '../audio/', import.meta.url);
for (const entries of Object.values(VOICES)) for (const entry of entries) entry.src = new URL(entry.file, base).href;

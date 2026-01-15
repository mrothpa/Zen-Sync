# 🃏 The Mind - Web Edition

Eine moderne, webbasierte Umsetzung des preisgekrönten Kartenspiels **"The Mind"**. Erlebe das faszinierende Experiment, bei dem Teams ohne Worte und Zeichen versuchen, Karten in der richtigen Reihenfolge abzulegen.

## ✨ Features

- **Echtzeit-Multiplayer:** Synchronisiertes Gameplay über Firebase Firestore.
- **Statistik-Dashboard:** - **Solo:** Verfolge deine persönliche Bestleistung und Präzision.
    - **Team:** Analysiere deine Synergie mit spezifischen Mitspielern.
    - **Global:** Miss dich mit der Welt im Top-10 Leaderboard.
- **Haptisches Feedback:** Vibration bei Fehlern (für mobile Browser).
- **Soziale Interaktion:** Sende Echtzeit-Emoji-Reaktionen (🤯, 👍, 🙏) an deine Mitspieler.
- **Modernes UI:** Design nach Material 3 Richtlinien mit flüssigen `framer-motion` Animationen.
- **Hybrid-Auth:** Spiele anonym als Gast oder sichere deinen Fortschritt per Login.

## 🚀 Technischer Stack

* **Frontend:** React.js mit TypeScript
* **Styling:** Tailwind CSS & Material UI (M3 Design)
* **Animationen:** Framer Motion
* **Backend/Datenbank:** Firebase (Firestore, Authentication, Hosting)

## 🛠️ Installation & Setup

1.  **Repository klonen:**
    ```bash
    git clone [https://github.com/mrothpa/the-mind.git](https://github.com/mrothpa/the-mind.git)
    cd the-mind
    ```

2.  **Abhängigkeiten installieren:**
    ```bash
    npm install
    ```

3.  **Firebase konfigurieren:**
    - Erstelle ein Projekt in der [Firebase Console](https://console.firebase.google.com/).
    - Aktiviere Firestore und Authentication (Google & Anonym).
    - Erstelle eine `.env` Datei im Hauptverzeichnis und füge deine Keys hinzu:
      ```env
      VITE_FIREBASE_API_KEY=dein_key
      VITE_FIREBASE_AUTH_DOMAIN=dein_projekt.firebaseapp.com
      VITE_FIREBASE_PROJECT_ID=dein_projekt
      ```

4.  **Lokal starten:**
    ```bash
    npm run dev
    ```

## 📈 Spielregeln (Kurzfassung)

1.  Das Team muss Karten von 1 bis 100 in aufsteigender Reihenfolge ablegen.
2.  Es darf **nicht** kommuniziert werden (keine Absprache, keine Zeichen).
3.  Konzentration und ein gemeinsames Zeitgefühl sind der Schlüssel zum Erfolg.
4.  Wurfsterne können genutzt werden, um die niedrigste Karte aller Spieler aufzudecken.

## 📱 Mobile Nutzung

Das Projekt ist als **PWA (Progressive Web App)** optimiert. Für das beste Erlebnis:
- Öffne die URL im mobilen Browser.
- Wähle **"Zum Home-Bildschirm hinzufügen"**.
- Genieße das Spiel im Vollbildmodus inklusive haptischem Feedback.

## 📝 Lizenz

Dieses Projekt wurde zu Bildungszwecken erstellt. Das Original-Spielprinzip stammt von Wolfgang Warsch (Nürnberger Spielkarten-Verlag).
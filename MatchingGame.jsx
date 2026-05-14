import { useEffect, useMemo, useState } from "react";

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadJson(filename, data) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export default function MatchingGame() {
  const [gameData, setGameData] = useState(null);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [lockedLeft, setLockedLeft] = useState([]);
  const [lockedRight, setLockedRight] = useState([]);
  const [wrongRight, setWrongRight] = useState([]);
  const [message, setMessage] = useState("");
  const [shuffleKey, setShuffleKey] = useState(0);

  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState({});

  const [openLeftEditor, setOpenLeftEditor] = useState(false);
  const [openRightEditor, setOpenRightEditor] = useState(false);

  useEffect(() => {
    fetch("/data/game.json")
      .then((res) => res.json())
      .then((data) => setGameData(data))
      .catch(() => setMessage("Could not load game.json"));
  }, []);

  const shuffledLeftItems = useMemo(() => {
    if (!gameData) return [];
    return shuffleArray(gameData.leftItems);
  }, [gameData, shuffleKey]);

  const shuffledRightItems = useMemo(() => {
    if (!gameData) return [];
    return shuffleArray(gameData.rightItems);
  }, [gameData, shuffleKey]);

  if (!gameData) return <div className="loading-screen">Loading...</div>;

  const calculatePoints = (mistakeCount) => {
    if (mistakeCount === 0) return 2;
    if (mistakeCount === 1) return 1;
    return 1 - mistakeCount;
  };

  const resetGame = () => {
    setSelectedLeft(null);
    setLockedLeft([]);
    setLockedRight([]);
    setWrongRight([]);
    setMessage("");
    setScore(0);
    setMistakes({});
    setShuffleKey((prev) => prev + 1);
  };

  const handleLeftClick = (item) => {
    if (lockedLeft.includes(item.id)) return;
    setSelectedLeft(item);
    setWrongRight([]);
    setMessage("");
  };

  const handleRightClick = (item) => {
    if (!selectedLeft) return;
    if (lockedRight.includes(item.id)) return;

    if (selectedLeft.pairId === item.pairId) {
      const mistakeCount = mistakes[selectedLeft.id] || 0;
      const points = calculatePoints(mistakeCount);

      setScore((prev) => prev + points);
      setLockedLeft((prev) => [...prev, selectedLeft.id]);
      setLockedRight((prev) => [...prev, item.id]);
      setSelectedLeft(null);
      setWrongRight([]);

      if (points > 0) {
        setMessage(`Correct +${points}`);
      } else {
        setMessage(`Correct ${points}`);
      }
    } else {
      setMistakes((prev) => ({
        ...prev,
        [selectedLeft.id]: (prev[selectedLeft.id] || 0) + 1
      }));

      setWrongRight([item.id]);
      setMessage("Wrong");
      setTimeout(() => setWrongRight([]), 800);
    }
  };

  const updateImage = async (side, index, file) => {
    if (!file) return;

    try {
      const base64Image = await fileToBase64(file);

      setGameData((prev) => {
        const updated = { ...prev };
        updated[side] = [...updated[side]];
        updated[side][index] = {
          ...updated[side][index],
          image: base64Image
        };
        return updated;
      });

      resetGame();
      setMessage("Image updated");
    } catch {
      setMessage("Image update failed");
    }
  };

  const loadJsonFile = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        if (!parsed.leftItems || !parsed.rightItems) {
          setMessage("Invalid JSON");
          return;
        }

        setGameData(parsed);
        resetGame();
        setMessage("JSON loaded");
      } catch {
        setMessage("Invalid JSON");
      }
    };
    reader.readAsText(file);
  };

  const exportJsonFile = () => {
    if (!gameData) return;
    downloadJson("arxiabeta-2.0-export.json", gameData);
    setMessage("JSON exported");
  };

  return (
    <div className="page ancient-theme">
      <div className="hero">
        <h1 className="main-title">
  Απο το παιχνίδι κ΄τον πόλεμο στην ευζωία κ΄τον ολυμπίσμο
</h1>

        <div className="score-box">Score: {score}</div>

        <div className="hero-actions">
          <button className="reload-btn" onClick={resetGame}>
            Ανακάτεμα
          </button>

          <button className="reload-btn" onClick={exportJsonFile}>
            Αποθήκευση
          </button>
        </div>
      </div>

      <div className="controls-box">
        <div className="import-row">
          <label className="import-label">Εισαγωγή Αρχείου</label>
          <input
            className="file-input"
            type="file"
            accept=".json"
            onChange={(e) => loadJsonFile(e.target.files[0])}
          />
        </div>
      </div>

      <div className="board">
        <div className="big-box">
          <h2>Τότε ήταν</h2>

          <div className="grid grid-2">
            {shuffledLeftItems.map((item) => {
              const isLocked = lockedLeft.includes(item.id);
              const isSelected = selectedLeft?.id === item.id;

              return (
                <button
                  key={item.id}
                  className={`tile ${isLocked ? "correct locked" : ""} ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => handleLeftClick(item)}
                >
                  <img src={item.image} alt="" />
                </button>
              );
            })}
          </div>

          <div className="editor-box">
            <div
              className="editor-toggle"
              onClick={() => setOpenLeftEditor(!openLeftEditor)}
            >
              Choose Left Images {openLeftEditor ? "▲" : "▼"}
            </div>

            {openLeftEditor && (
              <div className="editor-grid">
                {gameData.leftItems.map((item, index) => (
                  <div key={item.id} className="editor-item">
                    <span>Left {index + 1}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        updateImage("leftItems", index, e.target.files[0])
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="big-box">
          <h2>Τώρα είναι</h2>

          <div className="grid grid-4">
            {shuffledRightItems.map((item) => {
              const isLocked = lockedRight.includes(item.id);
              const isWrong = wrongRight.includes(item.id);

              return (
                <button
                  key={item.id}
                  className={`tile ${isLocked ? "correct locked" : ""} ${
                    isWrong ? "wrong" : ""
                  }`}
                  onClick={() => handleRightClick(item)}
                >
                  <img src={item.image} alt="" />
                </button>
              );
            })}
          </div>

          <div className="editor-box">
            <div
              className="editor-toggle"
              onClick={() => setOpenRightEditor(!openRightEditor)}
            >
              Choose Right Images {openRightEditor ? "▲" : "▼"}
            </div>

            {openRightEditor && (
              <div className="editor-grid">
                {gameData.rightItems.map((item, index) => (
                  <div key={item.id} className="editor-item">
                    <span>Right {index + 1}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        updateImage("rightItems", index, e.target.files[0])
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="message-box">{message}</div>
    </div>
  );
}
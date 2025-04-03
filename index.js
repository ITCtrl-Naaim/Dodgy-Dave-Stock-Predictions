import { HF_API_KEY, POLYGON_API_KEY } from "./apiKeys.js";
import { HfInference } from "https://cdn.jsdelivr.net/npm/@huggingface/inference/+esm";
import { dates } from "/utils/dates.js";

const hf = new HfInference(HF_API_KEY);

const tickersArr = [];

const generateReportBtn = document.querySelector(".generate-report-btn");

generateReportBtn.addEventListener("click", fetchStockData);

document.getElementById("ticker-input-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const tickerInput = document.getElementById("ticker-input");
  if (tickerInput.value.length > 2) {
    generateReportBtn.disabled = false;
    const newTickerStr = tickerInput.value;
    tickersArr.push(newTickerStr.toUpperCase());
    tickerInput.value = "";
    renderTickers();
  } else {
    const label = document.getElementsByTagName("label")[0];
    label.style.color = "red";
    label.textContent =
      "You must add at least one ticker. A ticker is a 3 letter or more code for a stock. E.g TSLA for Tesla.";
  }
});

function renderTickers() {
  const tickersDiv = document.querySelector(".ticker-choice-display");
  tickersDiv.innerHTML = "";
  tickersArr.forEach((ticker) => {
    const newTickerSpan = document.createElement("span");
    newTickerSpan.textContent = ticker;
    newTickerSpan.classList.add("ticker");
    tickersDiv.appendChild(newTickerSpan);
  });
}

const loadingArea = document.querySelector(".loading-panel");
const apiMessage = document.getElementById("api-message");

async function fetchStockData() {
  document.querySelector(".action-panel").style.display = "none";
  loadingArea.style.display = "flex";
  try {
    const stockData = await Promise.all(
      tickersArr.map(async (ticker) => {
        const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${dates.startDate}/${dates.endDate}?apiKey=${POLYGON_API_KEY}`;
        const response = await fetch(url);
        const data = await response.text();
        const status = response.status;
        if (status === 200) {
          apiMessage.innerText = "Creating report...";
          return data;
        } else {
          loadingArea.innerText = "There was an error fetching stock data.";
        }
      })
    );
    fetchReport(stockData.join(""));
  } catch (err) {
    loadingArea.innerText = "There was an error fetching stock data.";
    console.error("error: ", err);
  }
}

async function fetchReport(data) {
  const systemPrompt =
    "You are a trading guru. Given data on share prices over the past 3 days, write a report of no more than 50 words describing the stocks performance and recommending whether to buy, hold or sell.";
  const formattedInput = `<|system|>${systemPrompt}</s><|user|>${data}</s><|assistant|>`;

  try {
    const response = await hf.textGeneration({
      model: "mistralai/Mistral-7B-Instruct-v0.1",
      inputs: formattedInput,
      max_tokens: 100,
      temperature: 2,
    });
    const rawText = response.generated_text;
    const startIndex = rawText.indexOf("Based");
    const aiResponse =
      startIndex !== -1 ? rawText.slice(startIndex).trim() : rawText.trim();
    renderReport(aiResponse);
  } catch (error) {
    console.log("Error:", error);
    loadingArea.innerText = "Unable to access AI. Please refresh and try again";
  }
}

function renderReport(output) {
  loadingArea.style.display = "none";
  const outputArea = document.querySelector(".output-panel");
  const report = document.createElement("p");
  outputArea.appendChild(report);
  report.textContent = output;
  outputArea.style.display = "flex";
}

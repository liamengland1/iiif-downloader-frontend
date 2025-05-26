"use client"

import React from "react"

import { useState } from "react"
import "./App.css"

function App() {
  const [url, setUrl] = useState<string>("")
  const [size, setSize] = useState<number>(35)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [ocrEnabled, setOcrEnabled] = useState<boolean>(true)

  // console.log(import.meta.env.VITE_BACKEND)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url) {
      setError("Please enter a valid IIIF URL")
      return
    }

    setIsLoading(true)
    setError(null)
    setStatus("Initializing download...")

    try {

      // get env variable
      const apiUrl = import.meta.env.VITE_BACKEND || "http://localhost:8000/iiif2"
      let manifestUrl = url

      if (url.startsWith("https://dlg.usg.edu/") && !url.includes("/presentation/manifest.json")) {
        // Convert the URL to a IIIF manifest URL. Doing this for every school would be tedious because of different URL formats.
        // Since DLG (UGA/USG) is the main site I will be downloading from, I will hardcode this replacement in to save time.
        // https://dlg.usg.edu/record/guan_1633_089-017?canvas=0&x=400&y=400&w=1630
        manifestUrl = url.substring(0, url.indexOf("?")) + "/presentation/manifest.json"
        console.log("URL changed to: " + url)
      }

      // Construct the event stream URL with query parameters
      const myESurl = `${apiUrl}?manifestURL=${encodeURIComponent(manifestUrl)}&ocr=${ocrEnabled}&pctSize=${size / 100}`
      // const myAPIcall = `${apiUrl}?manifestURL=${encodeURIComponent(manifestUrl)}&ocr=${ocrEnabled}`:
      let totalImages = 0;
      let downloadedImages = 0;
      //const response = await fetch(myAPIcall);
      const es = new EventSource(myESurl);
      es.onmessage = (event) => {
        // console.log("Received event:", event.data);
        if (event.data.startsWith("imgtotal:")) {
          // If the event data starts with "imgtotal:", it indicates the total number of images
          totalImages = parseInt(event.data.substring(9), 10);
          setStatus(`Downloading images... 0/${totalImages}`);
        } else if (event.data.startsWith("imgdownloaded:")) {
          downloadedImages++;
          setStatus(`Downloading images... ${downloadedImages}/${totalImages}`);
        } else if (event.data.startsWith("pdfurl:")) {
          downloadFileFromEventStream(event.data.substring(7));
        } else if (event.data === "close") {
          es.close();
        } else if (event.data.indexOf(":") == -1) {
          // If the event data contains a colon, it should be handled above
          // Otherwise, treat it as a status update
          setStatus(event.data);
        }
      };

      es.onerror = (error) => {
        console.error("EventSource failed:", error);
        setError("An error occurred while processing the request.");
        es.close();
      };

      function downloadFileFromEventStream(pdfUrl: string) {
        const apiUrlTypedAsUrl = new URL(apiUrl);
        const baseUrl = `${apiUrlTypedAsUrl.protocol}//${apiUrlTypedAsUrl.host}`;
        pdfUrl = baseUrl + pdfUrl;

        // Get the PDF from the URL returned by the event stream
        fetch(pdfUrl).then((response) => {
          if (!response.ok) {
            throw new Error("Failed to download the PDF");
          }
          return response.blob();
        }).then((blob) => {
          // Create a URL for the blob
          const downloadUrl = window.URL.createObjectURL(blob);

          // Create a temporary anchor element to trigger the download
          const a = document.createElement("a");
          a.href = downloadUrl;

          // Set the filename based on the IIIF URL
          let filename = "iiif-download.pdf";
          a.download = filename;
          document.body.appendChild(a);
          a.click();

          // Clean up
          window.URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);
          setIsLoading(false)
          setStatus("Download complete!");
        })
      }


      // Get the blob from the response
      //const blob = await response.blob();

      // Create a URL for the blob
      /*const downloadUrl = window.URL.createObjectURL(blob);
 
      // Create a temporary anchor element to trigger the download
      const a = document.createElement("a");
      a.href = downloadUrl;
 
     
 
      let filename = "iiif-download.pdf";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
 
      // Clean up
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      */
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setStatus(null)
    }
  }

  return (<>
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Main Downloader Form */}
        <div className="w-full md:w-1/2 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">IIIF Downloader</h2>
            <a href="#help" className="text-sm text-blue-500 hover:underline">How to use?</a>
          </div>
          {/*<h1 className="text-2xl font-bold text-center text-gray-800 mb-6">IIIF Downloader</h1>*/}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                IIIF URL
              </label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://dlg.usg.edu/record/guan_1633_040-017"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Enter the URL to the IIIF item you want to download</p>
            </div>
            <br></br>
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                Size (% of original resolution): {size}%
              </label>
              <input
                id="size"
                type="range"
                min="10"
                max="100"
                step="1"
                value={size}
                onChange={(e) => setSize(Number.parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <br></br>
            <div className="flex items-center justify-between">
              <label htmlFor="ocr" className="text-sm font-medium text-gray-700 cursor-pointer">
                Enable OCR
              </label>
              <div className="relative inline-block w-12 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="ocr"
                  checked={ocrEnabled}
                  onChange={() => setOcrEnabled(!ocrEnabled)}
                  className="sr-only cursor-pointer"
                />
                <div
                  className={`cursor-pointer block h-6 rounded-full w-12 ${ocrEnabled ? "bg-emerald-500" : "bg-gray-300"
                    } transition-colors duration-200`}
                  onClick={() => setOcrEnabled(!ocrEnabled)}
                ></div>
                <div
                  className={`cursor-pointer absolute left-1 top-1 bg-white border-2 rounded-full h-4 w-4 transition-transform duration-200 transform ${ocrEnabled ? "translate-x-6 border-emerald-500" : "translate-x-0 border-gray-300"
                    }`}
                  onClick={() => setOcrEnabled(!ocrEnabled)}
                ></div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {ocrEnabled ? (
                <>
                  OCR will extract text from the image, making the PDF searchable. <b>This can take a few minutes for long (20+ pages) documents.</b> Please be patient.
                </>
              ) : (
                "OCR is disabled. The PDF will not be searchable."
              )}
            </div>


            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-300"
            >
              {isLoading ? "Processing..." : "Download PDF"}
            </button>
          </form>

          {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

          {status && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
              <div className="flex items-center">
                {isLoading && <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>}
                <span>{status}</span>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>This tool downloads a set of IIIF images according to your specified size setting and combines them into a single PDF.</p>
          </div>
        </div>


      </div>
    </div>
    {/* Information Box */}
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4" id="help">How to use:</h2>
      <ol className="space-y-3 text-gray-700 list-decimal pl-5">
        <li>
          Enter the url of the image/document you want to download in the URL field. (The URL should be a valid IIIF manifest)
        </li>
        <li>
          Adjust the size slider to set the desired size of the downloaded PDF.
          For example, 50% means each image/page will be downloaded at half of the original resolution.
          This is useful for reducing file size and download time.
          If you're unsure, start with the default size of 35% and adjust as needed.

        </li>
        <li>
          Enable or disable OCR (Optical Character Recognition) based on your needs.
          Enabling OCR will make the generated PDF searchable (using CTRL+f or similar) by extracting text from the image. <u>OCR can take a few minutes, especially for long documents, so if you don't need it, you can disable it.</u>
        </li>
        <li>
          Click the "Download PDF" button to start the download process.
          The tool will show you the progress of the download in real-time.
        </li>
        <li>
          Once the download is complete, a PDF file will be generated and saved to your device.
          The filename will be based on the IIIF URL you provided.
          If OCR is enabled, the PDF will be searchable.
        </li>
        <li>
          If you encounter any issues, please check the URL format and ensure it points to a valid IIIF image or document.
          You can also refer to the IIIF documentation for more information on supported formats and features.
        </li>
      </ol>

    </div>
  </>)
}

export default App

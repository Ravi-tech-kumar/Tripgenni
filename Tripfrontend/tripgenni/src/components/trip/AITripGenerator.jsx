import { useState, useRef, useEffect } from 'react';
import { 
    FaMagic, 
    FaMap, 
    FaCalendarAlt, 
    FaDollarSign, 
    FaSpinner, 
    FaHotel, 
    FaUtensils, 
    FaRunning, 
    FaPlane, 
    FaTimes,
    FaCopy,
    FaCheck,
    FaDownload
} from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { aiService } from '../../services/ai.service';
import { authService } from '../../services/auth.service';
import MapView from './MapView';

// Travel style options
const travelStyles = [
    { value: "budget", label: "💰 Budget", color: "bg-green-100 text-green-800" },
    { value: "balanced", label: "⚖️ Balanced", color: "bg-blue-100 text-blue-800" },
    { value: "luxury", label: "✨ Luxury", color: "bg-purple-100 text-purple-800" },
];

// Interest options
const interestOptions = [
    "🏛️ History", "🍜 Food", "🌳 Nature", "🎯 Adventure",
    "🛍️ Shopping", "🎨 Art", "🌙 Nightlife", "📸 Photography",
    "🏔️ Mountains", "🏖️ Beaches", "🕌 Culture", "🚗 Road Trip"
];

const AITripGenerator = ({ tripId, destination, startDate, endDate, budget, startingPoint, onGenerated }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingText, setStreamingText] = useState("");
    const [finalPlan, setFinalPlan] = useState(null);
    const [aiResponse, setAiResponse] = useState(null);
    const [showMap, setShowMap] = useState(false);
    const [error, setError] = useState(null);
    const [travelStyle, setTravelStyle] = useState("balanced");
    const [interests, setInterests] = useState([]);
    const [copied, setCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(true);
    
    const streamRef = useRef(null);
    const abortControllerRef = useRef(null);

    const totalDays = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);

    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.scrollTop = streamRef.current.scrollHeight;
        }
    }, [streamingText]);

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // SUPER ENHANCED Format AI output into clean Markdown
    const formatMarkdown = (raw) => {
    if (!raw) return "";
    let text = raw;

    // साफ cleanup
    text = text.replace(/data:/g, '').trim();
    text = text.replace(/undefined/g, '');

    // ================= FORCE LINE BREAKS =================
    // Break inline sections into new lines
    text = text.replace(/\s-\sMorning:/gi, '\n\n### 🌅 Morning\n');
    text = text.replace(/\s-\sAfternoon:/gi, '\n\n### ☀️ Afternoon\n');
    text = text.replace(/\s-\sEvening:/gi, '\n\n### 🌙 Evening\n');
    text = text.replace(/\s-\sNight:/gi, '\n\n### 🌙 Night\n');

    // Break bullets into new lines
    text = text.replace(/\s-\s/g, '\n- ');

    // ================= DAY HEADERS =================
    text = text.replace(/Title:\s*(.*)/i, '# $1\n');

    text = text.replace(/##\s*📅?\s*Day\s*(\d+)\s*[–-]\s*/gi, '\n\n## 📅 Day $1 – ');
    text = text.replace(/Day\s*(\d+)\s*[–-]\s*(.*)/gi, '\n\n## 📅 Day $1 – $2');

    // ================= FIX VISIT / EXPLORE =================
    text = text.replace(/(?<!📍\s)Visit\s+/g, '📍 Visit ');
    text = text.replace(/(?<!🔍\s)Explore\s+/g, '🔍 Explore ');

    // ================= MEALS =================
    text = text.replace(/Breakfast/gi, '🍳 Breakfast');
    text = text.replace(/Lunch/gi, '🍛 Lunch');
    text = text.replace(/Dinner/gi, '🍽️ Dinner');

    // ================= COST =================
    text = text.replace(/Approx\.?\s*INR/gi, '💰 Approx. INR');

    // ================= CLEAN STRUCTURE =================
    // Ensure bullet formatting
    text = text.replace(/^\s*-\s*/gm, '- ');

    // Add spacing between sections
    text = text.replace(/(?<!\n\n)(## 📅)/g, '\n\n$1');
    text = text.replace(/(?<!\n\n)(###)/g, '\n\n$1');

    // Fix line spacing
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
};
    const handleGenerate = async () => {
        if (isGenerating) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            setIsGenerating(false);
            toast.info("Generation cancelled");
            return;
        }

        setIsGenerating(true);
        setStreamingText("");
        setFinalPlan(null);
        setAiResponse(null);
        setError(null);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const currentUser = authService.getCurrentUser();
        
        const request = {
            tripId,
            destination,
            startingPoint: startingPoint || "your location",
            days: totalDays,
            budget: budget || 50000,
            travelStyle,
            interests,
            startDate,
            endDate,
            userId: currentUser?.userId,
            groupSize: 1,
        };

        try {
            await aiService.streamItinerary(
                request,
                (chunk, fullResponse) => {
                    const formattedChunk = formatMarkdown(fullResponse);
                    setStreamingText(formattedChunk);
                },
                (fullResponse) => {
                    const formatted = formatMarkdown(fullResponse);
                    setFinalPlan(formatted);
                    setIsGenerating(false);
                    abortControllerRef.current = null;
                    if (onGenerated) onGenerated({ plan: formatted });
                    toast.success("✨ Trip plan ready!");
                },
                (error) => {
                    console.error(error);
                    setError("Failed to generate trip plan. Please try again.");
                    setIsGenerating(false);
                    abortControllerRef.current = null;
                },
                abortController.signal
            );
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                setError("Failed to generate trip plan. Please try again.");
                toast.error("Generation failed");
            }
            setIsGenerating(false);
        }
    };

    const copyToClipboard = () => {
        if (finalPlan) {
            navigator.clipboard.writeText(finalPlan);
            setCopied(true);
            toast.success("Plan copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const downloadPlan = async () => {
        if (!finalPlan) return;

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>AI Generated Trip Plan - ${destination}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
                        max-width: 1000px;
                        margin: 0 auto;
                        padding: 40px 30px;
                        line-height: 1.6;
                        color: #1f2937;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                        padding-bottom: 25px;
                        border-bottom: 3px solid #8b5cf6;
                    }
                    h1 {
                        color: #7c3aed;
                        font-size: 32px;
                        margin-bottom: 15px;
                    }
                    h2 {
                        color: #7c3aed;
                        font-size: 24px;
                        margin-top: 30px;
                        margin-bottom: 15px;
                        border-left: 4px solid #8b5cf6;
                        padding-left: 15px;
                    }
                    h3 {
                        color: #2563eb;
                        font-size: 20px;
                        margin-top: 20px;
                        margin-bottom: 10px;
                    }
                    .trip-info {
                        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                        padding: 20px;
                        border-radius: 12px;
                        margin: 25px 0;
                    }
                    .trip-info p {
                        margin: 8px 0;
                    }
                    ul {
                        margin: 12px 0;
                        padding-left: 25px;
                    }
                    li {
                        margin: 8px 0;
                    }
                    .footer {
                        margin-top: 50px;
                        padding-top: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #6b7280;
                        border-top: 1px solid #e5e7eb;
                    }
                    .badge {
                        display: inline-block;
                        background: linear-gradient(135deg, #8b5cf6, #6366f1);
                        color: white;
                        padding: 5px 15px;
                        border-radius: 25px;
                        font-size: 12px;
                        margin-bottom: 20px;
                    }
                    @media print {
                        body { padding: 20px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="badge">✨ AI Generated Travel Plan</div>
                    <h1>✈️ ${destination} Trip Plan</h1>
                    <div class="trip-info">
                        <p><strong>📅 Duration:</strong> ${totalDays} days</p>
                        <p><strong>💰 Budget:</strong> ${formatCurrency(budget)}</p>
                        <p><strong>🎯 Travel Style:</strong> ${travelStyle.charAt(0).toUpperCase() + travelStyle.slice(1)}</p>
                        ${interests.length > 0 ? `<p><strong>🎨 Interests:</strong> ${interests.join(', ')}</p>` : ''}
                        <p><strong>📅 Generated:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div>
                    ${finalPlan
                        .replace(/\n/g, '<br/>')
                        .replace(/## 📅 (.*?)(<br\/>|$)/g, '<h2>📅 $1</h2>')
                        .replace(/### (.*?)(<br\/>|$)/g, '<h3>$1</h3>')
                        .replace(/- (.*?)(<br\/>|$)/g, '<li>$1</li>')
                        .replace(/<li>/g, '<ul><li>')
                        .replace(/<\/li><br\/>/g, '</li></ul>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                </div>
                
                <div class="footer">
                    <p>Generated by AI Trip Planner • Powered by DeepSeek AI</p>
                    <p>Plan your next adventure with intelligent AI recommendations!</p>
                </div>
            </body>
            </html>
        `;

        try {
            if (typeof window.html2pdf === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            
            const element = document.createElement('div');
            element.innerHTML = content;
            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: `${destination.replace(/\s/g, '_')}_Trip_Plan_${new Date().toISOString().slice(0, 10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            
            window.html2pdf().set(opt).from(element).save();
            toast.success("PDF downloaded successfully! 📄");
            
        } catch (pdfError) {
            console.warn('PDF generation failed, falling back to TXT:', pdfError);
            
            const plainText = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                         AI GENERATED TRIP PLAN - ${destination.padEnd(30)}                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

📋 TRIP SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Destination: ${destination}
📅 Duration: ${totalDays} days
💰 Budget: ${formatCurrency(budget)}
🎯 Travel Style: ${travelStyle.charAt(0).toUpperCase() + travelStyle.slice(1)}
${interests.length > 0 ? `🎨 Interests: ${interests.join(', ')}` : ''}
📅 Generated: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${finalPlan}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Generated by AI Trip Planner
💡 Plan your next adventure with intelligent AI recommendations!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            `;
            
            const blob = new Blob([plainText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${destination.replace(/\s/g, '_')}_Trip_Plan_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast.success("TXT file downloaded successfully! 📝");
        }
    };

    const toggleInterest = (interest) => {
        setInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    };

    if (!isOpen) return null;

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <FaMagic className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-semibold text-white">AI Trip Planner</h3>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:text-gray-200 transition"
                >
                    <FaTimes className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6">
                {/* Travel Style Selector */}
                {!finalPlan && !isGenerating && (
                    <>
                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">🎯 Travel Style</p>
                            <div className="flex flex-wrap gap-2">
                                {travelStyles.map(style => (
                                    <button
                                        key={style.value}
                                        onClick={() => setTravelStyle(style.value)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                            travelStyle === style.value 
                                                ? 'bg-purple-600 text-white shadow-md' 
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {style.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Interests Selector */}
                        <div className="mb-6">
                            <p className="text-sm font-medium text-gray-700 mb-2">🎨 Interests</p>
                            <div className="flex flex-wrap gap-2">
                                {interestOptions.map(interest => (
                                    <button
                                        key={interest}
                                        onClick={() => toggleInterest(interest)}
                                        className={`px-3 py-1.5 rounded-full text-sm transition ${
                                            interests.includes(interest) 
                                                ? 'bg-blue-500 text-white shadow-sm' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {interest}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Trip Info Summary */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 mb-4 text-sm border border-gray-200">
                    <div className="flex flex-wrap justify-between gap-2">
                        <div>
                            <span className="text-gray-500">📍 Destination:</span>
                            <span className="font-medium ml-1 text-gray-800">{destination}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">📅 Duration:</span>
                            <span className="font-medium ml-1 text-gray-800">{totalDays} days</span>
                        </div>
                        <div>
                            <span className="text-gray-500">💰 Budget:</span>
                            <span className="font-medium ml-1 text-gray-800">{formatCurrency(budget)}</span>
                        </div>
                    </div>
                </div>

                {/* Generate / Cancel Button */}
                <button
                    onClick={handleGenerate}
                    className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
                        isGenerating 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                    } text-white shadow-md`}
                >
                    {isGenerating ? (
                        <>
                            <FaSpinner className="animate-spin" />
                            Cancel Generation
                        </>
                    ) : finalPlan ? (
                        <>
                            <FaMagic />
                            Regenerate Plan
                        </>
                    ) : (
                        <>
                            <FaMagic />
                            Generate {totalDays}-Day Plan
                        </>
                    )}
                </button>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Streaming Output */}
                {isGenerating && streamingText && (
                    <div className="mt-4 border border-purple-200 rounded-xl overflow-hidden shadow-lg">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 text-sm font-medium text-gray-700 flex items-center gap-2 border-b border-purple-200">
                            <FaSpinner className="animate-spin text-purple-600" />
                            <span className="text-purple-700">✨ AI is writing your plan...</span>
                            <span className="text-xs text-gray-400 ml-2">(streaming live)</span>
                        </div>
                        <div ref={streamRef} className="max-h-96 overflow-y-auto p-5 bg-gray-50 prose prose-sm max-w-none"
                            style={{
                                fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}>
                            <ReactMarkdown
                                components={{
                                    h2: ({node, ...props}) => <h2 className="text-purple-700 text-lg font-bold mt-4 mb-3 border-b border-purple-200 pb-2" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-blue-600 text-base font-semibold mt-3 mb-2" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2" {...props} />,
                                    li: ({node, ...props}) => <li className="text-gray-600 my-1" {...props} />,
                                    strong: ({node, ...props}) => <strong className="text-gray-800 font-semibold" {...props} />
                                }}
                            >
                                {streamingText}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* Final Plan */}
                {finalPlan && !isGenerating && (
                    <div className="mt-4 bg-white rounded-xl border border-green-200 overflow-hidden shadow-lg">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 flex justify-between items-center flex-wrap gap-2 border-b border-green-200">
                            <span className="text-sm font-semibold text-green-800 flex items-center gap-2">
                                <FaMagic className="text-green-600" />
                                📋 Your Personalized Plan
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={copyToClipboard}
                                    className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1 transition px-3 py-1.5 rounded-lg hover:bg-green-100"
                                >
                                    {copied ? <FaCheck /> : <FaCopy />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={downloadPlan}
                                    className="text-purple-600 hover:text-purple-800 text-sm flex items-center gap-1 transition px-3 py-1.5 rounded-lg hover:bg-purple-50"
                                >
                                    <FaDownload />
                                    Download
                                </button>
                            </div>
                        </div>
                        <div className="p-5 text-gray-700 text-sm leading-relaxed max-h-[600px] overflow-y-auto"
                            style={{
                                fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}>
                            <ReactMarkdown
                                components={{
                                    h2: ({node, ...props}) => <h2 className="text-purple-700 text-xl font-bold mt-5 mb-3 border-b-2 border-purple-200 pb-2" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-blue-600 text-lg font-semibold mt-4 mb-2" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                                    li: ({node, ...props}) => <li className="text-gray-700 my-1" {...props} />,
                                    strong: ({node, ...props}) => <strong className="text-gray-900 font-semibold" {...props} />,
                                    p: ({node, ...props}) => <p className="text-gray-600 my-2" {...props} />
                                }}
                            >
                                {finalPlan}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* Structured Itinerary Display (from old version) */}
                {aiResponse && aiResponse.itinerary && !finalPlan && (
                    <div className="mt-6 space-y-6">
                        {/* Budget Breakdown */}
                        {aiResponse.budgetBreakdown && (
                            <div className="bg-gray-50 rounded-xl p-5">
                                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <FaDollarSign className="w-5 h-5 text-green-600" />
                                    Budget Breakdown (₹)
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-gray-600">
                                            <FaPlane className="w-4 h-4" /> Travel
                                        </span>
                                        <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.travel)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-gray-600">
                                            <FaHotel className="w-4 h-4" /> Stay
                                        </span>
                                        <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.stay)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-gray-600">
                                            <FaUtensils className="w-4 h-4" /> Food
                                        </span>
                                        <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.food)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-2 text-gray-600">
                                            <FaRunning className="w-4 h-4" /> Activities
                                        </span>
                                        <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.activities)}</span>
                                    </div>
                                    <div className="border-t pt-3 flex justify-between font-bold">
                                        <span>Total Estimated</span>
                                        <span className="text-blue-600">{formatCurrency(aiResponse.totalBudget)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Day-by-Day Itinerary */}
                        {aiResponse.itinerary && aiResponse.itinerary.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                                    Itinerary ({aiResponse.itinerary.length} days)
                                </h4>
                                <div className="space-y-4">
                                    {aiResponse.itinerary.map((day, idx) => (
                                        <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors">
                                            <h5 className="font-semibold text-gray-800">Day {day.day}: {day.title}</h5>
                                            <p className="text-gray-600 text-sm mt-1">{day.description}</p>
                                            {day.activities && day.activities.length > 0 && (
                                                <ul className="mt-2 space-y-1">
                                                    {day.activities.map((activity, i) => (
                                                        <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></span>
                                                            {activity}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {day.accommodation && (
                                                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                                                    <FaHotel className="w-3 h-3" /> {day.accommodation}
                                                </p>
                                            )}
                                            {day.estimatedCost && (
                                                <p className="text-sm text-gray-500 mt-1">💰 {formatCurrency(day.estimatedCost)}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Travel Tips */}
                        {aiResponse.tips && aiResponse.tips.length > 0 && (
                            <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
                                <h4 className="font-semibold text-blue-800 mb-3">✨ Travel Tips</h4>
                                <ul className="space-y-2">
                                    {aiResponse.tips.map((tip, idx) => (
                                        <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                                            <span className="text-blue-500">✓</span>
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Map View Button */}
                        {aiResponse.locations && aiResponse.locations.length > 0 && (
                            <div>
                                <button
                                    onClick={() => setShowMap(!showMap)}
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                    <FaMap className="w-4 h-4" />
                                    {showMap ? 'Hide Map' : 'Show Route Map'}
                                </button>
                                {showMap && (
                                    <div className="mt-4 h-80 rounded-xl overflow-hidden border">
                                        <MapView 
                                            destination={destination}
                                            locations={aiResponse.locations}
                                            height="320px"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AITripGenerator;









// import { useState, useRef, useEffect } from 'react';
// import { 
//     FaMagic, 
//     FaMap, 
//     FaCalendarAlt, 
//     FaDollarSign, 
//     FaSpinner, 
//     FaHotel, 
//     FaUtensils, 
//     FaRunning, 
//     FaPlane, 
//     FaTimes,
//     FaCopy,
//     FaCheck
// } from 'react-icons/fa';
// import ReactMarkdown from 'react-markdown';
// import toast from 'react-hot-toast';
// import { aiService } from '../../services/ai.service';
// import { authService } from '../../services/auth.service';
// import MapView from './MapView';

// // Travel style options
// const travelStyles = [
//     { value: "budget", label: "💰 Budget", color: "bg-green-100 text-green-800" },
//     { value: "balanced", label: "⚖️ Balanced", color: "bg-blue-100 text-blue-800" },
//     { value: "luxury", label: "✨ Luxury", color: "bg-purple-100 text-purple-800" },
// ];

// // Interest options
// const interestOptions = [
//     "🏛️ History", "🍜 Food", "🌳 Nature", "🎯 Adventure",
//     "🛍️ Shopping", "🎨 Art", "🌙 Nightlife", "📸 Photography",
//     "🏔️ Mountains", "🏖️ Beaches", "🕌 Culture", "🚗 Road Trip"
// ];

// const AITripGenerator = ({ tripId, destination, startDate, endDate, budget, startingPoint, onGenerated }) => {
//     const [isGenerating, setIsGenerating] = useState(false);
//     const [streamingText, setStreamingText] = useState("");
//     const [finalPlan, setFinalPlan] = useState(null);
//     const [aiResponse, setAiResponse] = useState(null);
//     const [showMap, setShowMap] = useState(false);
//     const [error, setError] = useState(null);
//     const [travelStyle, setTravelStyle] = useState("balanced");
//     const [interests, setInterests] = useState([]);
//     const [copied, setCopied] = useState(false);
//     const [isOpen, setIsOpen] = useState(true);
    
//     const streamRef = useRef(null);
//     const abortControllerRef = useRef(null);

//     const totalDays = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);

//     useEffect(() => {
//         if (streamRef.current) {
//             streamRef.current.scrollTop = streamRef.current.scrollHeight;
//         }
//     }, [streamingText]);

//     const formatCurrency = (amount) => {
//         if (!amount && amount !== 0) return '₹0';
//         return new Intl.NumberFormat('en-IN', {
//             style: 'currency',
//             currency: 'INR',
//             minimumFractionDigits: 0,
//             maximumFractionDigits: 0
//         }).format(amount);
//     };

//     // Format AI output into clean Markdown
//     const formatMarkdown = (raw) => {
//         if (!raw) return "";
//         let text = raw;

//         // Remove extra "data:" tokens if present
//         text = text.replace(/data:/g, '').trim();

//         // Format days as bold headers with emoji
//         text = text.replace(/Day\s*(\d+):?/gi, '## Day $1');

//         // Format Morning/Afternoon/Evening sections
//         text = text.replace(/-?\s*Morning:/gi, '- 🌅 **Morning:**');
//         text = text.replace(/-?\s*Afternoon:/gi, '- ☀️ **Afternoon:**');
//         text = text.replace(/-?\s*Evening:/gi, '- 🌙 **Evening:**');

//         // Format Accommodation
//         text = text.replace(/Accommodation:/gi, '🏨 **Accommodation:**');
        
//         // Format Budget sections
//         text = text.replace(/Budget:/gi, '💰 **Budget:**');

//         // Ensure bullets are consistent
//         text = text.replace(/^\s*-\s*/gm, '- ');

//         // Remove extra blank lines
//         text = text.replace(/\n{3,}/g, '\n\n');

//         return text.trim();
//     };

//     const handleGenerate = async () => {
//         if (isGenerating) {
//             // Cancel generation
//             if (abortControllerRef.current) {
//                 abortControllerRef.current.abort();
//                 abortControllerRef.current = null;
//             }
//             setIsGenerating(false);
//             toast.info("Generation cancelled");
//             return;
//         }

//         setIsGenerating(true);
//         setStreamingText("");
//         setFinalPlan(null);
//         setAiResponse(null);
//         setError(null);

//         const abortController = new AbortController();
//         abortControllerRef.current = abortController;

//         const currentUser = authService.getCurrentUser();
        
//         const request = {
//             tripId,
//             destination,
//             startingPoint: startingPoint || "your location",
//             days: totalDays,
//             budget: budget || 50000,
//             travelStyle,
//             interests,
//             startDate,
//             endDate,
//             userId: currentUser?.userId,
//             groupSize: 1,
//         };

//         try {
//             await aiService.streamItinerary(
//                 request,
//                 (chunk, fullResponse) => {
//                     const formattedChunk = formatMarkdown(fullResponse);
//                     setStreamingText(formattedChunk);
//                 },
//                 (fullResponse) => {
//                     const formatted = formatMarkdown(fullResponse);
//                     setFinalPlan(formatted);
//                     setIsGenerating(false);
//                     abortControllerRef.current = null;
//                     if (onGenerated) onGenerated({ plan: formatted });
//                     toast.success("✨ Trip plan ready!");
//                 },
//                 (error) => {
//                     console.error(error);
//                     setError("Failed to generate trip plan. Please try again.");
//                     setIsGenerating(false);
//                     abortControllerRef.current = null;
//                 },
//                 abortController.signal
//             );
//         } catch (err) {
//             if (err.name !== 'AbortError') {
//                 console.error(err);
//                 setError("Failed to generate trip plan. Please try again.");
//                 toast.error("Generation failed");
//             }
//             setIsGenerating(false);
//         }
//     };

//     const copyToClipboard = () => {
//         if (finalPlan) {
//             navigator.clipboard.writeText(finalPlan);
//             setCopied(true);
//             toast.success("Plan copied to clipboard!");
//             setTimeout(() => setCopied(false), 2000);
//         }
//     };

//     const toggleInterest = (interest) => {
//         setInterests(prev =>
//             prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
//         );
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
//             {/* Header */}
//             <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex justify-between items-center">
//                 <div className="flex items-center gap-2">
//                     <FaMagic className="w-5 h-5 text-white" />
//                     <h3 className="text-lg font-semibold text-white">AI Trip Planner</h3>
//                 </div>
//                 <button
//                     onClick={() => setIsOpen(false)}
//                     className="text-white hover:text-gray-200 transition"
//                 >
//                     <FaTimes className="w-5 h-5" />
//                 </button>
//             </div>

//             <div className="p-6">
//                 {/* Travel Style Selector */}
//                 {!finalPlan && !isGenerating && (
//                     <>
//                         <div className="mb-4">
//                             <p className="text-sm font-medium text-gray-700 mb-2">🎯 Travel Style</p>
//                             <div className="flex flex-wrap gap-2">
//                                 {travelStyles.map(style => (
//                                     <button
//                                         key={style.value}
//                                         onClick={() => setTravelStyle(style.value)}
//                                         className={`px-4 py-2 rounded-full text-sm font-medium transition ${
//                                             travelStyle === style.value 
//                                                 ? 'bg-purple-600 text-white shadow-md' 
//                                                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                                         }`}
//                                     >
//                                         {style.label}
//                                     </button>
//                                 ))}
//                             </div>
//                         </div>

//                         {/* Interests Selector */}
//                         <div className="mb-6">
//                             <p className="text-sm font-medium text-gray-700 mb-2">🎨 Interests</p>
//                             <div className="flex flex-wrap gap-2">
//                                 {interestOptions.map(interest => (
//                                     <button
//                                         key={interest}
//                                         onClick={() => toggleInterest(interest)}
//                                         className={`px-3 py-1.5 rounded-full text-sm transition ${
//                                             interests.includes(interest) 
//                                                 ? 'bg-blue-500 text-white shadow-sm' 
//                                                 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
//                                         }`}
//                                     >
//                                         {interest}
//                                     </button>
//                                 ))}
//                             </div>
//                         </div>
//                     </>
//                 )}

//                 {/* Trip Info Summary */}
//                 <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
//                     <div className="flex flex-wrap justify-between gap-2">
//                         <div>
//                             <span className="text-gray-500">📍 Destination:</span>
//                             <span className="font-medium ml-1">{destination}</span>
//                         </div>
//                         <div>
//                             <span className="text-gray-500">📅 Duration:</span>
//                             <span className="font-medium ml-1">{totalDays} days</span>
//                         </div>
//                         <div>
//                             <span className="text-gray-500">💰 Budget:</span>
//                             <span className="font-medium ml-1">{formatCurrency(budget)}</span>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Generate / Cancel Button */}
//                 <button
//                     onClick={handleGenerate}
//                     className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
//                         isGenerating 
//                             ? 'bg-red-500 hover:bg-red-600' 
//                             : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
//                     } text-white shadow-md`}
//                 >
//                     {isGenerating ? (
//                         <>
//                             <FaSpinner className="animate-spin" />
//                             Cancel Generation
//                         </>
//                     ) : finalPlan ? (
//                         <>
//                             <FaMagic />
//                             Regenerate Plan
//                         </>
//                     ) : (
//                         <>
//                             <FaMagic />
//                             Generate {totalDays}-Day Plan
//                         </>
//                     )}
//                 </button>

//                 {/* Error Message */}
//                 {error && (
//                     <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
//                         {error}
//                     </div>
//                 )}

//                 {/* Streaming Output */}
//                 {isGenerating && streamingText && (
//                     <div className="mt-4 border border-purple-200 rounded-xl overflow-hidden">
//                         <div className="bg-purple-50 px-4 py-2 text-sm font-medium text-gray-700 flex items-center gap-2">
//                             <FaSpinner className="animate-spin text-purple-600" />
//                             ✨ AI is writing your plan...
//                         </div>
//                         <div ref={streamRef} className="max-h-96 overflow-y-auto p-4 bg-gray-50 prose prose-sm max-w-none">
//                             <ReactMarkdown>{streamingText}</ReactMarkdown>
//                         </div>
//                     </div>
//                 )}

//                 {/* Final Plan */}
//                 {finalPlan && !isGenerating && (
//                     <div className="mt-4 bg-white rounded-xl border border-green-200 overflow-hidden shadow-sm">
//                         <div className="bg-green-50 px-4 py-2 flex justify-between items-center">
//                             <span className="text-sm font-medium text-green-800 flex items-center gap-2">
//                                 <FaMagic className="text-green-600" />
//                                 📋 Your Personalized Plan
//                             </span>
//                             <button
//                                 onClick={copyToClipboard}
//                                 className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1 transition"
//                             >
//                                 {copied ? <FaCheck /> : <FaCopy />}
//                                 {copied ? 'Copied!' : 'Copy'}
//                             </button>
//                         </div>
//                         <div className="p-4 text-gray-700 text-sm leading-relaxed max-h-96 overflow-y-auto prose prose-sm max-w-none">
//                             <ReactMarkdown>{finalPlan}</ReactMarkdown>
//                         </div>
//                     </div>
//                 )}

//                 {/* Structured Itinerary Display (from old version) */}
//                 {aiResponse && aiResponse.itinerary && !finalPlan && (
//                     <div className="mt-6 space-y-6">
//                         {/* Budget Breakdown */}
//                         {aiResponse.budgetBreakdown && (
//                             <div className="bg-gray-50 rounded-xl p-5">
//                                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
//                                     <FaDollarSign className="w-5 h-5 text-green-600" />
//                                     Budget Breakdown (₹)
//                                 </h4>
//                                 <div className="space-y-3">
//                                     <div className="flex justify-between items-center">
//                                         <span className="flex items-center gap-2 text-gray-600">
//                                             <FaPlane className="w-4 h-4" /> Travel
//                                         </span>
//                                         <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.travel)}</span>
//                                     </div>
//                                     <div className="flex justify-between items-center">
//                                         <span className="flex items-center gap-2 text-gray-600">
//                                             <FaHotel className="w-4 h-4" /> Stay
//                                         </span>
//                                         <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.stay)}</span>
//                                     </div>
//                                     <div className="flex justify-between items-center">
//                                         <span className="flex items-center gap-2 text-gray-600">
//                                             <FaUtensils className="w-4 h-4" /> Food
//                                         </span>
//                                         <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.food)}</span>
//                                     </div>
//                                     <div className="flex justify-between items-center">
//                                         <span className="flex items-center gap-2 text-gray-600">
//                                             <FaRunning className="w-4 h-4" /> Activities
//                                         </span>
//                                         <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.activities)}</span>
//                                     </div>
//                                     <div className="border-t pt-3 flex justify-between font-bold">
//                                         <span>Total Estimated</span>
//                                         <span className="text-blue-600">{formatCurrency(aiResponse.totalBudget)}</span>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}

//                         {/* Day-by-Day Itinerary */}
//                         {aiResponse.itinerary && aiResponse.itinerary.length > 0 && (
//                             <div>
//                                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
//                                     <FaCalendarAlt className="w-5 h-5 text-blue-600" />
//                                     Itinerary ({aiResponse.itinerary.length} days)
//                                 </h4>
//                                 <div className="space-y-4">
//                                     {aiResponse.itinerary.map((day, idx) => (
//                                         <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors">
//                                             <h5 className="font-semibold text-gray-800">Day {day.day}: {day.title}</h5>
//                                             <p className="text-gray-600 text-sm mt-1">{day.description}</p>
//                                             {day.activities && day.activities.length > 0 && (
//                                                 <ul className="mt-2 space-y-1">
//                                                     {day.activities.map((activity, i) => (
//                                                         <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
//                                                             <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></span>
//                                                             {activity}
//                                                         </li>
//                                                     ))}
//                                                 </ul>
//                                             )}
//                                             {day.accommodation && (
//                                                 <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
//                                                     <FaHotel className="w-3 h-3" /> {day.accommodation}
//                                                 </p>
//                                             )}
//                                             {day.estimatedCost && (
//                                                 <p className="text-sm text-gray-500 mt-1">💰 {formatCurrency(day.estimatedCost)}</p>
//                                             )}
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}

//                         {/* Travel Tips */}
//                         {aiResponse.tips && aiResponse.tips.length > 0 && (
//                             <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
//                                 <h4 className="font-semibold text-blue-800 mb-3">✨ Travel Tips</h4>
//                                 <ul className="space-y-2">
//                                     {aiResponse.tips.map((tip, idx) => (
//                                         <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
//                                             <span className="text-blue-500">✓</span>
//                                             {tip}
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </div>
//                         )}

//                         {/* Map View Button */}
//                         {aiResponse.locations && aiResponse.locations.length > 0 && (
//                             <div>
//                                 <button
//                                     onClick={() => setShowMap(!showMap)}
//                                     className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
//                                 >
//                                     <FaMap className="w-4 h-4" />
//                                     {showMap ? 'Hide Map' : 'Show Route Map'}
//                                 </button>
//                                 {showMap && (
//                                     <div className="mt-4 h-80 rounded-xl overflow-hidden border">
//                                         <MapView 
//                                             destination={destination}
//                                             locations={aiResponse.locations}
//                                             height="320px"
//                                         />
//                                     </div>
//                                 )}
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default AITripGenerator;

// import { useState } from 'react';
// import { 
//     FaMagic,
//     FaMap, 
//     FaCalendarAlt, 
//     FaDollarSign, 
//     FaSpinner, 
//     FaHotel, 
//     FaUtensils, 
//     FaRunning, 
//     FaPlane, 
//     FaTimes 
// } from 'react-icons/fa';
// import { aiService } from '../../services/ai.service';
// import { authService } from '../../services/auth.service';
// import MapView from './Mapview'; 

// const AITripGenerator = ({ tripId, destination, startDate, endDate, budget, startingPoint, onGenerated }) => {
//     const [loading, setLoading] = useState(false);
//     const [aiResponse, setAiResponse] = useState(null);
//     const [showMap, setShowMap] = useState(false);
//     const [error, setError] = useState(null);
//     const [isOpen, setIsOpen] = useState(true);

//     const formatCurrency = (amount) => {
//         if (!amount && amount !== 0) return '₹0';
//         return new Intl.NumberFormat('en-IN', {
//             style: 'currency',
//             currency: 'INR',
//             minimumFractionDigits: 0,
//             maximumFractionDigits: 0
//         }).format(amount);
//     };

//     const handleGenerate = async () => {
//         setLoading(true);
//         setError(null);
//         try {
//             const currentUser = authService.getCurrentUser();
            
//             // Convert budget to rupees if it's in dollars (assume budget is in INR)
//             const budgetInINR = budget || 0;
            
//             const response = await aiService.generateItinerary({
//                 tripId,
//                 destination,
//                 startDate,
//                 endDate,
//                 budget: budgetInINR,
//                 startingPoint: startingPoint, // Use prop instead of undefined trip variable
//                 userId: currentUser?.userId,
//                 interests: [],
//                 groupSize: 1,
//                 travelStyle: 'standard',
//                 description: `AI generated trip plan for ${destination}`
//             });
//             setAiResponse(response);
//             if (onGenerated) onGenerated(response);
//         } catch (error) {
//             console.error('AI generation failed:', error);
//             setError('Failed to generate AI trip plan. Please try again.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
//             {/* Header */}
//             <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex justify-between items-center">
//                 <div className="flex items-center gap-2">
//                     <FaMagic className="w-5 h-5 text-white" />
//                     <h3 className="text-lg font-semibold text-white">AI Trip Planner</h3>
//                 </div>
//                 <button
//                     onClick={() => setIsOpen(false)}
//                     className="text-white hover:text-gray-200 transition"
//                 >
//                     <FaTimes className="w-5 h-5" />
//                 </button>
//             </div>

//             <div className="p-6">
//                 {!aiResponse && !loading && (
//                     <div className="text-center py-8">
//                         <FaMagic className="w-12 h-12 text-purple-400 mx-auto mb-3" />
//                         <p className="text-gray-600 mb-4">Let AI create a personalized itinerary for your trip to {destination}!</p>
//                         <button
//                             onClick={handleGenerate}
//                             className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition"
//                         >
//                             Generate AI Plan
//                         </button>
//                     </div>
//                 )}

//                 {loading && (
//                     <div className="text-center py-12">
//                         <FaSpinner className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-3" />
//                         <p className="text-gray-600">AI is planning your perfect itinerary...</p>
//                         <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
//                     </div>
//                 )}

//                 {error && (
//                     <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
//                         {error}
//                     </div>
//                 )}

//                 {aiResponse && (
//                     <div className="space-y-6">
//                         {/* Budget Breakdown */}
//                         {aiResponse.budgetBreakdown && (
//                             <div className="bg-gray-50 rounded-xl p-5">
//                                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
//                                     <FaDollarSign className="w-5 h-5 text-green-600" />
//                                     Budget Breakdown (₹)
//                                 </h4>
//                                 <div className="space-y-3">
//                                     <div className="flex justify-between items-center">
//                                         <span className="flex items-center gap-2 text-gray-600">
//                                             <FaPlane className="w-4 h-4" /> Travel
//                                         </span>
//                                         <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.travel)}</span>
//                                     </div>
//                                     <div className="flex justify-between items-center">
//                                         <span className="flex items-center gap-2 text-gray-600">
//                                             <FaHotel className="w-4 h-4" /> Stay
//                                         </span>
//                                         <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.stay)}</span>
//                                     </div>
//                                     <div className="flex justify-between items-center">
//                                         <span className="flex items-center gap-2 text-gray-600">
//                                             <FaUtensils className="w-4 h-4" /> Food
//                                         </span>
//                                         <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.food)}</span>
//                                     </div>
//                                     <div className="flex justify-between items-center">
//                                         <span className="flex items-center gap-2 text-gray-600">
//                                             <FaRunning className="w-4 h-4" /> Activities
//                                         </span>
//                                         <span className="font-semibold">{formatCurrency(aiResponse.budgetBreakdown.activities)}</span>
//                                     </div>
//                                     <div className="border-t pt-3 flex justify-between font-bold">
//                                         <span>Total Estimated</span>
//                                         <span className="text-blue-600">{formatCurrency(aiResponse.totalBudget)}</span>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}

//                         {/* Day-by-Day Itinerary */}
//                         {aiResponse.itinerary && aiResponse.itinerary.length > 0 && (
//                             <div>
//                                 <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
//                                     <FaCalendarAlt className="w-5 h-5 text-blue-600" />
//                                     Itinerary ({aiResponse.itinerary.length} days)
//                                 </h4>
//                                 <div className="space-y-4">
//                                     {aiResponse.itinerary.map((day, idx) => (
//                                         <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors">
//                                             <h5 className="font-semibold text-gray-800">Day {day.day}: {day.title}</h5>
//                                             <p className="text-gray-600 text-sm mt-1">{day.description}</p>
//                                             {day.activities && day.activities.length > 0 && (
//                                                 <ul className="mt-2 space-y-1">
//                                                     {day.activities.map((activity, i) => (
//                                                         <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
//                                                             <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></span>
//                                                             {activity}
//                                                         </li>
//                                                     ))}
//                                                 </ul>
//                                             )}
//                                             {day.accommodation && (
//                                                 <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
//                                                     <FaHotel className="w-3 h-3" /> {day.accommodation}
//                                                 </p>
//                                             )}
//                                             {day.estimatedCost && (
//                                                 <p className="text-sm text-gray-500 mt-1">💰 {formatCurrency(day.estimatedCost)}</p>
//                                             )}
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}

//                         {/* Travel Tips */}
//                         {aiResponse.tips && aiResponse.tips.length > 0 && (
//                             <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
//                                 <h4 className="font-semibold text-blue-800 mb-3">✨ Travel Tips</h4>
//                                 <ul className="space-y-2">
//                                     {aiResponse.tips.map((tip, idx) => (
//                                         <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
//                                             <span className="text-blue-500">✓</span>
//                                             {tip}
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </div>
//                         )}

//                         {/* Map View Button */}
//                         {aiResponse.locations && aiResponse.locations.length > 0 && (
//                             <div>
//                                 <button
//                                     onClick={() => setShowMap(!showMap)}
//                                     className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
//                                 >
//                                     <FaMap className="w-4 h-4" />
//                                     {showMap ? 'Hide Map' : 'Show Route Map'}
//                                 </button>
//                                 {showMap && (
//                                     <div className="mt-4 h-80 rounded-xl overflow-hidden border">
//                                         <MapView 
//                                             destination={destination}
//                                             locations={aiResponse.locations}
//                                             height="320px"
//                                         />
//                                     </div>
//                                 )}
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };

// export default AITripGenerator;
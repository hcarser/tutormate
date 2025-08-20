  const chatContainer = document.getElementById('chat-container');
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        const typingIndicator = document.getElementById('typing-indicator');
        const mathButtonsContainer = document.getElementById('math-buttons');
        const clearChatButton = document.getElementById('clear-chat');

        // --- PROMPT PRINCIPAL ---
        const MATE_TUTOR_PROMPT = `
            Actúa como "Saulito", un experto tutor de matemáticas.

            **Personalidad:** Eres un tutor paciente, amigable y alentador. Tu objetivo es guiar, no solo dar respuestas.

            **FORMATO DE RESPUESTA (REGLAS ESTRICTAS):**
            1.  **Usa Markdown y LaTeX:** Para texto y **todas** las expresiones matemáticas.
            2.  **GRÁFICOS:** Si el usuario pide ayuda con una recta numérica, un plano cartesiano o una figura geométrica, **DEBES** incluir en tu respuesta un bloque de código JSON con la acción correspondiente.

            **A. RECTA NUMÉRICA:**
                - Usa la acción "drawNumberLine".
                - Para procesos (ej. -2+7), muestra el inicio y el final con dos bloques JSON separados por texto.
                - **Ejemplo JSON:** \`\`\`json{"action": "drawNumberLine", "options": { "min": -10, "max": 10, "pointAt": -2, "label": "Inicio" }}\`\`\`

            **B. PLANO CARTESIANO:**
                - Usa la acción "drawCartesianPlane".
                - **SIEMPRE** ajusta el rango (x_min, x_max, etc.) para que los puntos a graficar se vean claramente.
                - **Ejemplo JSON:** \`\`\`json{"action": "drawCartesianPlane", "options": {"x_min": -5, "x_max": 5, "y_min": -5, "y_max": 5, "points": [{"x": 2, "y": 3, "label": "A(2, 3)"}]}}\`\`\`

            **C. FIGURAS GEOMÉTRICAS:**
                - Usa la acción "drawGeometricShape".
                - **Ejemplo JSON para un triángulo:** \`\`\`json{"action": "drawGeometricShape", "options": {"shape": "triangle", "labels": ["A", "B", "C"]}}\`\`\`
                - **Otras formas soportadas:** "square", "parallelogram", "trapezoid".
        `;

        let chatHistory = [{ role: "user", parts: [{ text: MATE_TUTOR_PROMPT }] }];

        const mathSymbols = [
            { display: '√', insert: '\\sqrt{}' }, { display: 'x²', insert: '^{2}' },
            { display: 'x³', insert: '^{3}' }, { display: 'xⁿ', insert: '^{n}' },
            { display: 'π', insert: '\\pi' }, { display: '∞', insert: '\\infty' },
            { display: 'α', insert: '\\alpha' }, { display: 'β', insert: '\\beta' },
            { display: 'θ', insert: '\\theta' }, { display: 'Σ', insert: '\\sum' },
            { display: '∫', insert: '\\int' }, { display: '≠', insert: '\\neq' },
            { display: '≤', insert: '\\leq' }, { display: '≥', insert: '\\geq' },
        ];

        mathSymbols.forEach(symbol => {
            const button = document.createElement('button');
            button.innerHTML = symbol.display;
            button.title = symbol.insert;
            button.className = 'bg-slate-100 text-slate-700 px-3 py-1 rounded-md hover:bg-slate-200 transition-colors text-sm';
            button.onclick = () => insertAtCursor(symbol.insert);
            mathButtonsContainer.appendChild(button);
        });

        function insertAtCursor(text) {
            const startPos = userInput.selectionStart;
            const endPos = userInput.selectionEnd;
            const textToInsert = text;
            userInput.value = userInput.value.substring(0, startPos) + textToInsert + userInput.value.substring(endPos);
            userInput.focus();
            if (text.includes("{}")) {
                userInput.selectionEnd = startPos + textToInsert.length - 1;
            } else {
                userInput.selectionEnd = startPos + textToInsert.length;
            }
        }

        function addMessage(sender, message) {
            const messageWrapper = document.createElement('div');
            if (sender === 'user') {
                messageWrapper.className = "flex justify-end";
                messageWrapper.innerHTML = `<div class="bg-indigo-600 text-white p-3 rounded-l-2xl rounded-t-2xl max-w-lg shadow">${message}</div>`;
                chatContainer.appendChild(messageWrapper);
                renderMathInElement(messageWrapper.querySelector('div'), { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}], throwOnError: false });
            } else {
                messageWrapper.className = "flex justify-start";
                messageWrapper.innerHTML = `<div class="bg-slate-200 text-slate-800 p-3 rounded-r-2xl rounded-t-2xl max-w-lg shadow message-content-container"></div>`;
                chatContainer.appendChild(messageWrapper);
                const contentContainer = messageWrapper.querySelector('.message-content-container');
                const jsonRegex = /(```json\s*[\s\S]*?\s*```)/g;
                const parts = message.split(jsonRegex);
                parts.forEach(part => {
                    if (part.startsWith('```json')) {
                        try {
                            const jsonString = part.replace(/```json|```/g, '');
                            const visualData = JSON.parse(jsonString);
                            const visualContainer = document.createElement('div');
                            visualContainer.className = 'visual-container my-3';
                            contentContainer.appendChild(visualContainer);
                            if (visualData.action === 'drawNumberLine') {
                                drawNumberLine(visualContainer, visualData.options);
                            } else if (visualData.action === 'drawCartesianPlane') {
                                drawCartesianPlane(visualContainer, visualData.options);
                            } else if (visualData.action === 'drawGeometricShape') {
                                drawGeometricShape(visualContainer, visualData.options);
                            }
                        } catch (e) { console.error("Failed to parse JSON:", e); }
                    } else {
                        if (part.trim() === '') return;
                        const textDiv = document.createElement('div');
                        let htmlContent = part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                        htmlContent = htmlContent.replace(/^- (.*?)($|<br>)/gm, '<ul><li class="ml-4 list-disc">$1</li></ul>').replace(/<\/ul><br><ul>/g, '');
                        textDiv.innerHTML = htmlContent;
                        contentContainer.appendChild(textDiv);
                        renderMathInElement(textDiv, { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}], throwOnError: false });
                    }
                });
            }
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        function drawNumberLine(container, options) {
            const canvas = document.createElement('canvas');
            container.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            const { min, max, pointAt, label } = options;
            const range = max - min;
            function draw() {
                const width = canvas.offsetWidth;
                canvas.height = 100; // Fixed height for number line
                canvas.width = width;
                ctx.clearRect(0, 0, width, canvas.height);
                ctx.font = '12px Inter';
                ctx.fillStyle = '#475569';
                const y_axis = canvas.height * 0.5;
                const padding = 25;
                ctx.beginPath();
                ctx.moveTo(padding, y_axis);
                ctx.lineTo(width - padding, y_axis);
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 2;
                ctx.stroke();
                for (let i = min; i <= max; i++) {
                    const x = padding + ((i - min) / range) * (width - 2 * padding);
                    ctx.beginPath();
                    ctx.moveTo(x, y_axis - 5);
                    ctx.lineTo(x, y_axis + 5);
                    ctx.stroke();
                    ctx.textAlign = 'center';
                    ctx.fillText(i, x, y_axis + 20);
                }
                if (pointAt !== undefined && pointAt >= min && pointAt <= max) {
                    const pointX = padding + ((pointAt - min) / range) * (width - 2 * padding);
                    ctx.beginPath();
                    ctx.arc(pointX, y_axis, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = '#4f46e5';
                    ctx.fill();
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    if (label) {
                       ctx.fillStyle = '#4f46e5';
                       ctx.font = 'bold 14px Inter';
                       ctx.fillText(label, pointX, y_axis - 15);
                    }
                }
            }
            new ResizeObserver(draw).observe(container);
            draw();
        }

        function drawCartesianPlane(container, options) {
            const canvas = document.createElement('canvas');
            container.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            const { x_min, x_max, y_min, y_max, points } = options;
            
            function draw() {
                const width = canvas.offsetWidth;
                const height = canvas.offsetHeight;
                canvas.width = width;
                canvas.height = height;
                ctx.clearRect(0, 0, width, height);

                const padding = 30;
                const xRange = x_max - x_min;
                const yRange = y_max - y_min;
                
                const originX = width - padding - ( (x_max / xRange) * (width - 2 * padding) );
                const originY = padding + ( (y_max / yRange) * (height - 2 * padding) );

                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 1;
                for (let i = x_min; i <= x_max; i++) {
                    const x = padding + ((i - x_min) / xRange) * (width - 2 * padding);
                    ctx.beginPath(); ctx.moveTo(x, padding); ctx.lineTo(x, height - padding); ctx.stroke();
                }
                for (let i = y_min; i <= y_max; i++) {
                    const y = padding + ((i - y_min) / yRange) * (height - 2 * padding);
                    ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
                }

                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(padding, originY); ctx.lineTo(width - padding, originY); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(originX, padding); ctx.lineTo(originX, height - padding); ctx.stroke();

                ctx.fillStyle = '#475569';
                ctx.font = '12px Inter';
                for (let i = x_min; i <= x_max; i++) {
                    if (i === 0) continue;
                    const x = padding + ((i - x_min) / xRange) * (width - 2 * padding);
                    ctx.textAlign = 'center';
                    ctx.fillText(i, x, originY + 15);
                }
                for (let i = y_min; i <= y_max; i++) {
                    if (i === 0) continue;
                    const y = padding + ((i - y_min) / yRange) * (height - 2 * padding);
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(i, originX - 5, height - y);
                }

                if (points && points.length > 0) {
                    points.forEach(point => {
                        const pointX = padding + ((point.x - x_min) / xRange) * (width - 2 * padding);
                        const pointY = height - (padding + ((point.y - y_min) / yRange) * (height - 2 * padding));
                        
                        ctx.beginPath();
                        ctx.arc(pointX, pointY, 6, 0, 2 * Math.PI);
                        ctx.fillStyle = '#db2777';
                        ctx.fill();
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 2;
                        ctx.stroke();

                        if (point.label) {
                           ctx.fillStyle = '#db2777';
                           ctx.font = 'bold 14px Inter';
                           ctx.textAlign = 'center';
                           ctx.fillText(point.label, pointX, pointY - 15);
                        }
                    });
                }
            }
            new ResizeObserver(draw).observe(container);
            draw();
        }

        function drawGeometricShape(container, options) {
            const canvas = document.createElement('canvas');
            container.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            const { shape, labels = [] } = options;

            function draw() {
                const width = canvas.offsetWidth;
                const height = canvas.offsetHeight;
                canvas.width = width;
                canvas.height = height;
                ctx.clearRect(0, 0, width, height);

                const padding = 25;
                const w = width - 2 * padding;
                const h = height - 2 * padding;
                
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 2;
                ctx.font = 'bold 16px Inter';
                ctx.fillStyle = '#4f46e5';

                ctx.beginPath();

                let points = [];

                switch (shape) {
                    case 'square':
                        const side = Math.min(w, h);
                        const startX = padding + (w - side) / 2;
                        const startY = padding + (h - side) / 2;
                        points = [
                            { x: startX, y: startY }, { x: startX + side, y: startY },
                            { x: startX + side, y: startY + side }, { x: startX, y: startY + side }
                        ];
                        break;
                    case 'triangle':
                        points = [
                            { x: padding + w / 2, y: padding }, { x: padding + w, y: padding + h },
                            { x: padding, y: padding + h }
                        ];
                        break;
                    case 'parallelogram':
                        const offset = w * 0.25;
                        points = [
                            { x: padding + offset, y: padding }, { x: padding + w, y: padding },
                            { x: padding + w - offset, y: padding + h }, { x: padding, y: padding + h }
                        ];
                        break;
                    case 'trapezoid':
                         const topOffset = w * 0.2;
                         const bottomOffset = w * 0.1;
                         points = [
                            { x: padding + topOffset, y: padding }, { x: padding + w - topOffset, y: padding },
                            { x: padding + w - bottomOffset, y: padding + h }, { x: padding + bottomOffset, y: padding + h }
                         ];
                         break;
                }

                if (points.length > 0) {
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y);
                    }
                    ctx.closePath();
                    ctx.stroke();

                    points.forEach((p, i) => {
                        if (labels[i]) {
                            let labelX = p.x; let labelY = p.y;
                            if (labelX < width / 2) labelX -= 15; else labelX += 15;
                            if (labelY < height / 2) labelY -= 15; else labelY += 15;
                            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                            ctx.fillText(labels[i], labelX, labelY);
                        }
                    });
                }
            }
            new ResizeObserver(draw).observe(container);
            draw();
        }

        async function handleUserInput() {
            const userMessage = userInput.value.trim();
            if (!userMessage) return;
            addMessage('user', userMessage);
            userInput.value = '';
            userInput.disabled = true;
            sendButton.disabled = true;
            typingIndicator.classList.remove('hidden');
            chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
            try {
                const payload = { contents: chatHistory };
                const apiKey = "AIzaSyBA3gKQIV1fpOjsBOelajfQ2SqhMVsGLwg";
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`API Error: ${response.status}`);
                const result = await response.json();
                let tutorResponse = "Lo siento, tuve un problema. Intenta de nuevo.";
                if (result.candidates && result.candidates[0]?.content?.parts?.[0]) {
                    tutorResponse = result.candidates[0].content.parts[0].text;
                }
                chatHistory.push({ role: "model", parts: [{ text: tutorResponse }] });
                addMessage('tutor', tutorResponse);
            } catch (error) {
                console.error("Error calling Gemini API:", error);
                addMessage('tutor', "¡Uy! Hay un problema de conexión. Inténtalo de nuevo.");
            } finally {
                userInput.disabled = false;
                sendButton.disabled = false;
                typingIndicator.classList.add('hidden');
                userInput.focus();
            }
        }

        function startNewChat() {
            chatContainer.innerHTML = '';
            chatHistory = [{ role: "user", parts: [{ text: MATE_TUTOR_PROMPT }] }];
            const welcomeMessage = "¡Hola! Soy Saulito. Pide ayuda con un problema, un concepto, una recta numérica o un plano cartesiano.";
            addMessage('tutor', welcomeMessage);
            chatHistory.push({ role: "model", parts: [{ text: welcomeMessage }] });
            userInput.focus();
        }

        sendButton.addEventListener('click', handleUserInput);
        userInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleUserInput();
            }
        });
        clearChatButton.addEventListener('click', startNewChat);
        window.onload = startNewChat;
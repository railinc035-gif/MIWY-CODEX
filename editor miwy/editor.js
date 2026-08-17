/* =====================================================  
   EDITOR VISUAL & VISTA DE APLICACIÓN (editor.js)
===================================================== */  

let isVisualEditing = false; 
window.__pendingCodeFix = null;

function getDockOrientation() {
    return localStorage.getItem("miwy_dock_orientation") || "horizontal";
}

function setDockOrientation(orient) {
    localStorage.setItem("miwy_dock_orientation", orient);
    updateDockSettingsUI();
    updatePreview();
}

function updateDockSettingsUI() {
    const orient = getDockOrientation();

    const horizBtn = document.getElementById("dockOrientHorizontalBtn");
    const vertBtn = document.getElementById("dockOrientVerticalBtn");

    if (horizBtn && vertBtn) {
        if (orient === "horizontal") {
            horizBtn.style.border = "1px solid var(--orange)";
            horizBtn.style.color = "var(--orange)";
            vertBtn.style.border = "";
            vertBtn.style.color = "";
        } else {
            vertBtn.style.border = "1px solid var(--orange)";
            vertBtn.style.color = "var(--orange)";
            horizBtn.style.border = "";
            horizBtn.style.color = "";
        }
    }

    const parentDock = document.getElementById("parentVisualDock");
    if (parentDock) {
        if (orient === "vertical") {
            parentDock.classList.add("vertical");
        } else {
            parentDock.classList.remove("vertical");
        }
    }
}

function toggleVisualEdit() { 
    isVisualEditing = !isVisualEditing; 
    const btn = document.getElementById("visualEditBtn"); 
    if (btn) { 
        btn.classList.toggle("active", isVisualEditing); 
    } 

    const parentDock = document.getElementById("parentVisualDock");
    if (parentDock) {
        parentDock.style.display = isVisualEditing ? "flex" : "none";
    }

    if (typeof showShortcutToast === "function") {
        showShortcutToast("Edición Visual", isVisualEditing ? "Activada (Haz clic en elementos para editar)" : "Desactivada"); 
    }
    updatePreview(); 
} 

/* =====================================================  
   PREVIEW / VISTA DE APLICACIÓN  
===================================================== */  
function updatePreview(){  
    const project = typeof getCurrentProject === "function" ? getCurrentProject() : null;  
    if(!project) return;  
  
    const files = project.files || {};  
  
    let html = "";
    if (typeof currentFileName !== "undefined" && currentFileName && typeof getFileType === "function" && getFileType(currentFileName) === "html" && files[currentFileName] !== undefined) {
        html = files[currentFileName];
    } else if (files["index.html"] !== undefined) {
        html = files["index.html"];
    } else {
        const htmlFiles = Object.keys(files).filter(f => typeof getFileType === "function" && getFileType(f) === "html");
        if (htmlFiles.length > 0) {
            html = files[htmlFiles[0]];
        }
    }
  
    let css = "";  
    let js = "";  
  
    Object.keys(files).forEach(filename => {  
        const type = typeof getFileType === "function" ? getFileType(filename) : "";  
        if(type === "css") css += "\n" + files[filename];  
        if(type === "js") js += "\n" + files[filename];  

        const fileContent = files[filename];
        if (fileContent && (filename.includes("/") || filename.includes("."))) {
            const escapedName = filename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const srcRegex = new RegExp('(src|href)=["\']' + escapedName + '["\']', 'g');
            if (fileContent.startsWith("data:")) {
                html = html.replace(srcRegex, '$1="' + fileContent + '"');
            }
        }
    });  
  
    if(!html){  
        html = `  
<!DOCTYPE html>  
<html lang="es">  
<head>  
<meta charset="UTF-8">  
<meta name="viewport" content="width=device-width, initial-scale=1.0">  
<title>Miwy App</title>  
<style>
    body {
        margin: 0;
        padding: 0;
        font-family: system-ui, -apple-system, sans-serif;
        background: linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        text-align: center;
    }
    .card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 106, 0, 0.2);
        padding: 30px;
        border-radius: 16px;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        max-width: 80%;
    }
    h1 { margin-top: 0; color: #ff6a00; font-size: 24px; }
    p { color: #aaa; font-size: 14px; margin-bottom: 20px; }
</style>
</head>  
<body>  
    <div class="card">
        <h1>🚀 Tu app o web se reflejará aquí</h1>
        <p>Crea o edita tus archivos HTML, CSS y JS para ver los cambios en tiempo real.</p>
    </div>
</body>  
</html>  
`;  
    }  
  
    const style = `<style>${css}</style>`;  
    const script = `<script>\n${js}\n<\/script>`;  
  
    if(html.includes("</head>")){  
        html = html.replace("</head>", style + "</head>");  
    } else {  
        html = style + html;  
    }  

    if(html.includes("</body>")){  
        html = html.replace("</body>", script + "</body>");  
    } else {  
        html += script;  
    }  

    const errorBanner = document.getElementById("previewErrorBanner"); 
    if(errorBanner && (!window.__pendingCodeFix || errorBanner.style.display !== "flex")) {
        errorBanner.style.display = "none"; 
    }
 
    // Inject global error catcher and visual editor inside iframe
    const errorCatcherScript = ` 
<script id="__miwy_system_script__"> 
window.onerror = function(message, source, lineno, colno, error) { 
    if (!message || message.includes("Script error")) return false;
    window.parent.postMessage({ 
        type: 'iframe-error', 
        message: message, 
        lineno: lineno, 
        colno: colno, 
        source: source 
    }, '*'); 
    return false; 
}; 
window.onunhandledrejection = function(event) { 
    var reason = event.reason ? (event.reason.message || event.reason) : 'Unhandled rejection';
    window.parent.postMessage({ 
        type: 'iframe-error', 
        message: reason, 
        lineno: null, 
        colno: null, 
        source: null 
    }, '*'); 
}; 
 
(function() { 
    var isVisual = ${isVisualEditing ? 'true' : 'false'}; 
    if (!isVisual) return; 
 
    document.addEventListener("DOMContentLoaded", initVisualEditor); 
    if (document.readyState === "interactive" || document.readyState === "complete") { 
        initVisualEditor(); 
    } 
 
    function initVisualEditor() { 
        var style = document.createElement('style'); 
        style.id = '__miwy_visual_style__'; 
        style.textContent = \` 
            [data-miwy-editable]:hover { 
                outline: 1.5px dashed #ff6a00 !important; 
                outline-offset: 2px !important; 
                cursor: pointer !important; 
            } 
            [data-miwy-selected] { 
                outline: 2px solid #ff6a00 !important; 
                outline-offset: 2px !important; 
                position: relative !important;
            } 
            .miwy-resize-corner {
                position: absolute;
                right: -5px;
                bottom: -5px;
                width: 10px;
                height: 10px;
                background: #ff6a00;
                border: 1.5px solid #fff;
                border-radius: 50%;
                cursor: se-resize;
                z-index: 100000;
            }
            .miwy-move-handle {
                position: absolute;
                left: -5px;
                top: -5px;
                width: 14px;
                height: 14px;
                background: #38bdf8;
                border: 1.5px solid #fff;
                border-radius: 50%;
                cursor: move;
                z-index: 100000;
            }
        \`; 
        document.head.appendChild(style); 

        var selectedTarget = null;

        window.addEventListener('message', function(evt) {
            if (!evt.data || evt.data.type !== 'visual-dock-action') return;
            var act = evt.data.act;
            var val = evt.data.val;

            if (!selectedTarget && !act.startsWith('add-')) {
                alert('Selecciona un elemento de la vista primero.');
                return;
            }

            if (act === 'text' && selectedTarget) {
                selectedTarget.setAttribute('contenteditable', 'true');
                selectedTarget.focus();
            } else if (act === 'color' && selectedTarget) {
                if (selectedTarget.tagName === 'DIV' || selectedTarget.tagName === 'CARD' || selectedTarget.tagName === 'SECTION' || selectedTarget.tagName === 'ARTICLE') {
                    selectedTarget.style.backgroundColor = val;
                } else {
                    selectedTarget.style.color = val;
                }
                sendCleanHtml();
            } else if (act === 'font-plus' && selectedTarget) {
                var curSize = parseFloat(window.getComputedStyle(selectedTarget).fontSize) || 16;
                selectedTarget.style.fontSize = (curSize + 2) + 'px';
                sendCleanHtml();
            } else if (act === 'font-minus' && selectedTarget) {
                var curSize = parseFloat(window.getComputedStyle(selectedTarget).fontSize) || 16;
                selectedTarget.style.fontSize = Math.max(10, curSize - 2) + 'px';
                sendCleanHtml();
            } else if (act === 'bold' && selectedTarget) {
                var curWeight = window.getComputedStyle(selectedTarget).fontWeight;
                selectedTarget.style.fontWeight = (curWeight === 'bold' || parseInt(curWeight) >= 600) ? 'normal' : 'bold';
                sendCleanHtml();
            } else if (act === 'align' && selectedTarget) {
                var curAlign = window.getComputedStyle(selectedTarget).textAlign;
                if (curAlign === 'center') selectedTarget.style.textAlign = 'right';
                else if (curAlign === 'right') selectedTarget.style.textAlign = 'left';
                else selectedTarget.style.textAlign = 'center';
                sendCleanHtml();
            } else if (act === 'radius' && selectedTarget) {
                var curRad = parseFloat(window.getComputedStyle(selectedTarget).borderRadius) || 0;
                selectedTarget.style.borderRadius = (curRad >= 20 ? '0px' : (curRad + 6) + 'px');
                sendCleanHtml();
            } else if (act === 'add-title') {
                var h = document.createElement('h2');
                h.textContent = 'Nuevo Título';
                h.style.color = '#38bdf8';
                var parent = selectedTarget ? selectedTarget.parentNode : document.body;
                parent.appendChild(h);
                attachElementEvents(h);
                selectElement(h);
                sendCleanHtml();
            } else if (act === 'add-btn') {
                var b = document.createElement('button');
                b.textContent = 'Nuevo Botón';
                b.style.padding = '10px 18px';
                b.style.backgroundColor = '#ff6a00';
                b.style.color = '#000';
                b.style.border = 'none';
                b.style.borderRadius = '8px';
                b.style.cursor = 'pointer';
                b.style.margin = '6px';
                var parent = selectedTarget ? selectedTarget.parentNode : document.body;
                parent.appendChild(b);
                attachElementEvents(b);
                selectElement(b);
                sendCleanHtml();
            } else if (act === 'add-card') {
                var card = document.createElement('div');
                card.style.padding = '20px';
                card.style.backgroundColor = '#1e293b';
                card.style.borderRadius = '12px';
                card.style.border = '1px solid #334155';
                card.style.margin = '12px 0';
                card.style.color = '#ffffff';
                card.innerHTML = '<h3>Título de Tarjeta</h3><p>Contenido de la nueva tarjeta agregada visualmente.</p>';
                var parent = selectedTarget ? selectedTarget.parentNode : document.body;
                parent.appendChild(card);
                attachElementEvents(card);
                selectElement(card);
                sendCleanHtml();
            } else if (act === 'add-img-data' && val) {
                if (selectedTarget && selectedTarget.tagName === 'IMG') {
                    selectedTarget.src = val;
                } else {
                    var img = document.createElement('img');
                    img.src = val;
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.style.borderRadius = '8px';
                    img.style.margin = '10px 0';
                    var parent = selectedTarget ? selectedTarget.parentNode : document.body;
                    parent.appendChild(img);
                    attachElementEvents(img);
                    selectElement(img);
                }
                sendCleanHtml();
            } else if (act === 'edit-attr' && selectedTarget) {
                if (selectedTarget.tagName === 'IMG') {
                    var newUrl = prompt('URL de la imagen (src):', selectedTarget.getAttribute('src') || '');
                    if (newUrl !== null) {
                        selectedTarget.src = newUrl;
                        sendCleanHtml();
                    }
                } else if (selectedTarget.tagName === 'A') {
                    var newHref = prompt('Enlace de destino (href):', selectedTarget.getAttribute('href') || '#');
                    if (newHref !== null) {
                        selectedTarget.setAttribute('href', newHref);
                        sendCleanHtml();
                    }
                } else if (selectedTarget.tagName === 'INPUT') {
                    var newPlace = prompt('Texto de relleno (placeholder):', selectedTarget.getAttribute('placeholder') || '');
                    if (newPlace !== null) {
                        selectedTarget.setAttribute('placeholder', newPlace);
                        sendCleanHtml();
                    }
                } else {
                    var attrName = prompt('Nombre del atributo a editar (ej. href, id, class, src):', 'id');
                    if (attrName) {
                        var attrVal = prompt('Valor para "' + attrName + '":', selectedTarget.getAttribute(attrName) || '');
                        if (attrVal !== null) {
                            selectedTarget.setAttribute(attrName, attrVal);
                            sendCleanHtml();
                        }
                    }
                }
            } else if (act === 'up' && selectedTarget) {
                var prev = selectedTarget.previousElementSibling;
                if (prev && !prev.hasAttribute('data-miwy-system')) {
                    selectedTarget.parentNode.insertBefore(selectedTarget, prev);
                    sendCleanHtml();
                }
            } else if (act === 'down' && selectedTarget) {
                var next = selectedTarget.nextElementSibling;
                if (next && !next.hasAttribute('data-miwy-system')) {
                    selectedTarget.parentNode.insertBefore(next, selectedTarget);
                    sendCleanHtml();
                }
            } else if (act === 'dup' && selectedTarget) {
                var clone = selectedTarget.cloneNode(true);
                clone.querySelectorAll('[data-miwy-system]').forEach(function(s) { s.remove(); });
                clone.removeAttribute('data-miwy-selected');
                selectedTarget.parentNode.insertBefore(clone, selectedTarget.nextSibling);
                attachElementEvents(clone);
                selectElement(clone);
                sendCleanHtml();
            } else if (act === 'del' && selectedTarget) {
                var toDel = selectedTarget;
                clearSelection();
                toDel.remove();
                sendCleanHtml();
            }
        });

        function clearSelection() {
            if (selectedTarget) {
                selectedTarget.removeAttribute('data-miwy-selected');
                document.querySelectorAll('.miwy-resize-corner, .miwy-move-handle').forEach(function(el) { el.remove(); });
                selectedTarget = null;
            }
        }

        function selectElement(target) {
            clearSelection();
            if (!target || target.hasAttribute('data-miwy-system') || target.closest('.miwy-floating-dock')) return;

            selectedTarget = target;
            selectedTarget.setAttribute('data-miwy-selected', 'true');

            var resizeCorner = document.createElement('div');
            resizeCorner.className = 'miwy-resize-corner';
            resizeCorner.setAttribute('data-miwy-system', 'true');
            selectedTarget.appendChild(resizeCorner);

            resizeCorner.addEventListener('mousedown', function(e) {
                e.stopPropagation();
                e.preventDefault();
                var startX = e.clientX, startY = e.clientY;
                var startW = selectedTarget.offsetWidth, startH = selectedTarget.offsetHeight;

                function doResize(me) {
                    selectedTarget.style.width = Math.max(20, startW + (me.clientX - startX)) + 'px';
                    selectedTarget.style.height = Math.max(20, startH + (me.clientY - startY)) + 'px';
                }
                function stopResize() {
                    window.removeEventListener('mousemove', doResize);
                    window.removeEventListener('mouseup', stopResize);
                    sendCleanHtml();
                }
                window.addEventListener('mousemove', doResize);
                window.addEventListener('mouseup', stopResize);
            });

            var moveHandle = document.createElement('div');
            moveHandle.className = 'miwy-move-handle';
            moveHandle.setAttribute('data-miwy-system', 'true');
            moveHandle.title = 'Arrastrar para reubicar elemento';
            selectedTarget.appendChild(moveHandle);

            moveHandle.addEventListener('mousedown', function(e) {
                e.stopPropagation();
                e.preventDefault();
                var draggingElem = true;
                selectedTarget.style.position = 'relative';
                var startX = e.clientX, startY = e.clientY;
                var startLeft = parseFloat(selectedTarget.style.left) || 0;
                var startTop = parseFloat(selectedTarget.style.top) || 0;

                function doElemMove(me) {
                    if (!draggingElem) return;
                    selectedTarget.style.left = (startLeft + (me.clientX - startX)) + 'px';
                    selectedTarget.style.top = (startTop + (me.clientY - startY)) + 'px';
                }

                function stopElemMove() {
                    draggingElem = false;
                    window.removeEventListener('mousemove', doElemMove);
                    window.removeEventListener('mouseup', stopElemMove);
                    sendCleanHtml();
                }

                window.addEventListener('mousemove', doElemMove);
                window.addEventListener('mouseup', stopElemMove);
            });
        }

        function attachElementEvents(el) {
            if (el.tagName === 'BODY' || el.tagName === 'HTML' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.hasAttribute('data-miwy-system') || el.closest('.miwy-floating-dock')) return;

            if (el.closest('.card') || el.closest('.container') || (el.textContent && (el.textContent.includes("Tu app o web se reflejará aquí") || el.textContent.includes("¡Bienvenido a Miwy!")))) {
                return;
            }

            el.setAttribute('data-miwy-editable', 'true');

            el.addEventListener('click', function(e) {
                e.stopPropagation();
                selectElement(el);
            });

            el.addEventListener('input', sendCleanHtml);
            el.addEventListener('blur', sendCleanHtml);
        }

        var elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, a, span, label, li, th, td, b, strong, i, em, div, img, section, article, header, footer, input, form'); 
        elements.forEach(function(el) { 
            attachElementEvents(el);
        }); 

        document.addEventListener('click', function(e) {
            if (!e.target.closest('[data-miwy-editable]') && !e.target.closest('.miwy-floating-dock')) {
                clearSelection();
            }
        });
    } 
 
    function sendCleanHtml() { 
        var clone = document.documentElement.cloneNode(true); 
        var sysScript = clone.querySelector('#__miwy_system_script__'); 
        if (sysScript) sysScript.remove(); 
        var visStyle = clone.querySelector('#__miwy_visual_style__'); 
        if (visStyle) visStyle.remove(); 
 
        var systemElements = clone.querySelectorAll('[data-miwy-system], .miwy-resize-corner, .miwy-move-handle, .miwy-minimal-toolbar, .miwy-floating-dock');
        systemElements.forEach(function(s) { s.remove(); });

        var editables = clone.querySelectorAll('[data-miwy-editable], [data-miwy-selected]'); 
        editables.forEach(function(el) { 
            el.removeAttribute('contenteditable'); 
            el.removeAttribute('data-miwy-editable'); 
            el.removeAttribute('data-miwy-selected'); 
        }); 
 
        var htmlStr = '<!DOCTYPE html>\\n<html' + (clone.getAttribute('lang') ? ' lang="' + clone.getAttribute('lang') + '"' : '') + '>' + clone.innerHTML + '\\n</html>'; 
        window.parent.postMessage({ 
            type: 'preview-visual-edit', 
            html: htmlStr 
        }, '*'); 
    } 
})(); 
<\/script> 
`; 

    if(html.includes("<head>")){ 
        html = html.replace("<head>", "<head>" + errorCatcherScript); 
    } else { 
        html = errorCatcherScript + html; 
    } 
 
    const previewFrame = document.getElementById("previewFrame");
    if (previewFrame) {
        previewFrame.srcdoc = html;  
    }
}  

function sendDockCommand(action, value) {
    const previewFrame = document.getElementById("previewFrame");
    if (previewFrame && previewFrame.contentWindow) {
        previewFrame.contentWindow.postMessage({
            type: 'visual-dock-action',
            act: action,
            val: value
        }, '*');
    }
}

/* =====================================================  
   POSTMESSAGE ERROR HANDLER Y EDICIÓN VISUAL 
==================================================== */  
window.addEventListener("message", function(event) { 
    if (!event.data) return; 
 
    if (event.data.type === 'preview-visual-edit' && event.data.html) { 
        const project = typeof getCurrentProject === "function" ? getCurrentProject() : null; 
        if (!project) return; 
 
        project.files['index.html'] = event.data.html; 
        project.edited = true; 
 
        if (typeof currentFileName !== "undefined" && currentFileName === 'index.html' && typeof codeEditor !== "undefined") { 
            codeEditor.value = event.data.html; 
            if (typeof updateLineCounter === "function") updateLineCounter(); 
        } 
 
        if (typeof saveProjects === "function") saveProjects(); 
        if (typeof saveCurrentFile === "function") saveCurrentFile();
        showTopNotification("💾 Cambios visuales guardados automáticamente", null, 2500);
        return; 
    } 
 
    if (event.data && event.data.type === 'iframe-error') { 
        const data = event.data; 
        let errorText = data.message; 
        if (data.lineno) { 
            errorText += ` (Línea ${data.lineno})`; 
        } 

        let fixText = "Revisa la declaración de variables o etiquetas HTML."; 
        let proposedFixCode = null;
        const msgLower = data.message.toLowerCase();

        if (msgLower.includes("is not defined")) { 
            const matches = data.message.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s+is not defined/); 
            const varName = matches ? matches[1] : "variable"; 
            fixText = `Propuesta: Inicializar "${varName}" automáticamente.`; 
            proposedFixCode = `\n<script>var ${varName} = ${varName} || function(){ console.log('${varName} inicializado'); };<\/script>`;
        }

        showTopNotification(`⚠️ Error: ${errorText}`, proposedFixCode ? { text: fixText, code: proposedFixCode } : null);
    } 
}); 

/* =====================================================  
   INICIALIZACIÓN DE CONTROLES AL CARGAR DOM
===================================================== */  
document.addEventListener("DOMContentLoaded", function() {
    const previewFrame = document.getElementById("previewFrame");
    const desktopPreview = document.getElementById("desktopPreview");  
    const mobilePreview = document.getElementById("mobilePreview");  
    const mobileLandscapePreview = document.getElementById("mobileLandscapePreview");

    if (desktopPreview && previewFrame) {
        desktopPreview.addEventListener("click", () => {  
            previewFrame.className = "preview-frame";
            desktopPreview.classList.add("active");  
            if (mobilePreview) mobilePreview.classList.remove("active");  
            if (mobileLandscapePreview) mobileLandscapePreview.classList.remove("active");  
        });  
    }

    if (mobilePreview && previewFrame) {
        mobilePreview.addEventListener("click", () => {  
            previewFrame.className = "preview-frame mobile";
            mobilePreview.classList.add("active");  
            if (desktopPreview) desktopPreview.classList.remove("active");  
            if (mobileLandscapePreview) mobileLandscapePreview.classList.remove("active");  
        });  
    }

    if (mobileLandscapePreview && previewFrame) {
        mobileLandscapePreview.addEventListener("click", () => {  
            previewFrame.className = "preview-frame mobile-horizontal";
            mobileLandscapePreview.classList.add("active");  
            if (desktopPreview) desktopPreview.classList.remove("active");  
            if (mobilePreview) mobilePreview.classList.remove("active");  
        });  
    }

    // Parent Visual Dock Drag Handler Across Whole Screen
    const parentDock = document.getElementById("parentVisualDock");
    const parentHandle = document.getElementById("__parent_dockHandle");
    if (parentDock && parentHandle) {
        let draggingParentDock = false;
        let pOffsetX = 0, pOffsetY = 0;

        parentHandle.addEventListener("mousedown", (e) => {
            draggingParentDock = true;
            const rect = parentDock.getBoundingClientRect();
            pOffsetX = e.clientX - rect.left;
            pOffsetY = e.clientY - rect.top;
            parentDock.style.transform = "none";
            parentDock.style.bottom = "auto";
            parentDock.style.right = "auto";
        });

        document.addEventListener("mousemove", (e) => {
            if (!draggingParentDock) return;
            parentDock.style.left = (e.clientX - pOffsetX) + "px";
            parentDock.style.top = (e.clientY - pOffsetY) + "px";
        });

        document.addEventListener("mouseup", () => {
            draggingParentDock = false;
        });

        // Parent Dock Button Event Delegation
        parentDock.addEventListener("click", (e) => {
            e.stopPropagation();
            const btn = e.target.closest(".miwy-tb-btn");
            if (!btn) return;
            const act = btn.getAttribute("data-act");
            if (act === "add-img") {
                const parentInput = document.getElementById("__parent_fileInput");
                if (parentInput) parentInput.click();
            } else {
                sendDockCommand(act, null);
            }
        });

        const chromInput = document.getElementById("__parent_chromaticColor");
        if (chromInput) {
            chromInput.addEventListener("input", (e) => {
                sendDockCommand("color", e.target.value);
            });
        }

        const parentFileInput = document.getElementById("__parent_fileInput");
        if (parentFileInput) {
            parentFileInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    sendDockCommand("add-img-data", evt.target.result);
                };
                reader.readAsDataURL(file);
                parentFileInput.value = "";
            });
        }
    }

    // Error banner Apply Fix button handler
    const applyFixBtn = document.getElementById("applyFixBtn");
    if (applyFixBtn) {
        applyFixBtn.addEventListener("click", () => {
            if (window.__pendingCodeFix && typeof codeEditor !== "undefined") {
                codeEditor.value += window.__pendingCodeFix;
                if (typeof saveCurrentFile === "function") saveCurrentFile();
                if (typeof saveProjects === "function") saveProjects();
                if (typeof updatePreview === "function") updatePreview();
                showTopNotification("✅ Solución aplicada correctamente al código", null, 2500);
            }
        });
    }

    const visSettingsBtn = document.getElementById("visualEditorSettingsBtn");
    const visSection = document.getElementById("visualEditorSection");
    const settingsMain = document.getElementById("settingsMain");

    if (visSettingsBtn && visSection && settingsMain) {
        visSettingsBtn.addEventListener("click", () => {
            settingsMain.style.display = "none";
            visSection.classList.add("active");
            updateDockSettingsUI();
        });
    }

    const horizBtn = document.getElementById("dockOrientHorizontalBtn");
    const vertBtn = document.getElementById("dockOrientVerticalBtn");

    if (horizBtn) horizBtn.addEventListener("click", () => setDockOrientation("horizontal"));
    if (vertBtn) vertBtn.addEventListener("click", () => setDockOrientation("vertical"));

    updateDockSettingsUI();
});

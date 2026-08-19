/* =====================================================  
   EDITOR VISUAL & VISTA DE APLICACIÓN (editor.js)
===================================================== */  

let isVisualEditing = false; 
window.__pendingCodeFix = null;
let updatePreviewTimer = null;

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
function updatePreview() {
    clearTimeout(updatePreviewTimer);
    updatePreviewTimer = setTimeout(updatePreviewImmediate, 200);
}

function updatePreviewImmediate(){  
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
        const fileContent = files[filename] || "";

        if (type === "css") {
            const escapedName = filename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const cssRegex = new RegExp('<link[^>]*href=["\'](?:\\./)?' + escapedName + '["\'][^>]*>', 'gi');
            if (cssRegex.test(html)) {
                html = html.replace(cssRegex, '<style>/* ' + filename + ' */\n' + fileContent + '</style>');
            } else {
                css += "\n/* " + filename + " */\n" + fileContent;
            }
        } else if (type === "js") {
            const escapedName = filename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const jsRegex = new RegExp('<script[^>]*src=["\'](?:\\./)?' + escapedName + '["\'][^>]*>\\s*</script>', 'gi');
            if (jsRegex.test(html)) {
                html = html.replace(jsRegex, '<script>/* ' + filename + ' */\n' + fileContent + '<\/script>');
            } else {
                js += "\n/* " + filename + " */\n" + fileContent;
            }
        } else {
            if (fileContent && (filename.includes("/") || filename.includes("."))) {
                const escapedName = filename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const srcRegex = new RegExp('(src|href)=["\']' + escapedName + '["\']', 'gi');
                if (fileContent.startsWith("data:")) {
                    html = html.replace(srcRegex, '$1="' + fileContent + '"');
                }
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
 
    const currentOrientation = getDockOrientation();

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
        if (previewFrame.__lastHtml !== html) {
            previewFrame.__lastHtml = html;
            previewFrame.srcdoc = html;  
        }
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
        if (typeof showTopNotification === "function") {
            showTopNotification("💾 Cambios visuales guardados automáticamente", null, 2500);
        }
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

        if (typeof showTopNotification === "function") {
            showTopNotification(`⚠️ Error: ${errorText}`, proposedFixCode ? { text: fixText, code: proposedFixCode } : null);
        }
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

    const applyFixBtn = document.getElementById("applyFixBtn");
    if (applyFixBtn) {
        applyFixBtn.addEventListener("click", () => {
            if (window.__pendingCodeFix && typeof codeEditor !== "undefined") {
                codeEditor.value += window.__pendingCodeFix;
                if (typeof saveCurrentFile === "function") saveCurrentFile();
                if (typeof saveProjects === "function") saveProjects();
                if (typeof updatePreview === "function") updatePreview();
                if (typeof showTopNotification === "function") {
                    showTopNotification("✅ Solución aplicada correctamente al código", null, 2500);
                }
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

    initCodeSearchAndReplace();
    initAutocompleteAndFormatter();
    initSettingsToggles();
});

function initSettingsToggles() {
    const searchBtn = document.getElementById("toggleSearchSettingBtn");
    const autoBtn = document.getElementById("toggleAutocompleteSettingBtn");
    const autoStatus = document.getElementById("autocompleteSettingStatus");
    const settingsOverlay = document.getElementById("settingsOverlay");

    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
            if (settingsOverlay) settingsOverlay.classList.remove("open");
            toggleCodeSearch(true);
        });
    }

    if (autoBtn) {
        autoBtn.addEventListener("click", () => {
            isAutocompleteEnabled = !isAutocompleteEnabled;
            if (autoStatus) {
                autoStatus.textContent = isAutocompleteEnabled ? "Activado (Sugerencias e IntelliSense)" : "Desactivado";
                autoStatus.style.color = isAutocompleteEnabled ? "#42d66b" : "#ff4d4d";
            }
            if (typeof showTopNotification === "function") {
                showTopNotification(isAutocompleteEnabled ? "💡 Auto-Completado Activado" : "💡 Auto-Completado Desactivado", null, 2500);
            }
        });
    }
}

/* =====================================================
   AUTO-COMPLETADO E INTELLISENSE
===================================================== */
let isAutocompleteEnabled = true;
let isFormatterEnabled = true;
let autocompleteSelectedIndex = 0;
let currentCompletions = [];

const COMPLETER_DICTIONARY = {
    html: [
        { label: "div", snippet: "<div></div>", desc: "Contenedor div HTML" },
        { label: "span", snippet: "<span></span>", desc: "Elemento inline span" },
        { label: "button", snippet: "<button></button>", desc: "Botón clickeable" },
        { label: "p", snippet: "<p></p>", desc: "Párrafo de texto" },
        { label: "h1", snippet: "<h1></h1>", desc: "Encabezado principal H1" },
        { label: "h2", snippet: "<h2></h2>", desc: "Encabezado H2" },
        { label: "input", snippet: '<input type="text" placeholder="...">', desc: "Campo de entrada" },
        { label: "a", snippet: '<a href="#"></a>', desc: "Enlace hipertexto" },
        { label: "img", snippet: '<img src="" alt="...">', desc: "Imagen HTML" },
        { label: "script", snippet: "<script>\n  \n</script>", desc: "Bloque Script JS" },
        { label: "style", snippet: "<style>\n  \n</style>", desc: "Bloque Estilo CSS" },
        { label: "flex", snippet: '<div style="display: flex; gap: 10px; align-items: center;">\n  \n</div>', desc: "Layout Flexbox" }
    ],
    css: [
        { label: "display", snippet: "display: flex;", desc: "Modelo de caja flex" },
        { label: "background", snippet: "background: #111;", desc: "Color de fondo" },
        { label: "color", snippet: "color: #fff;", desc: "Color de texto" },
        { label: "padding", snippet: "padding: 10px;", desc: "Relleno interior" },
        { label: "margin", snippet: "margin: 0;", desc: "Margen exterior" },
        { label: "border-radius", snippet: "border-radius: 8px;", desc: "Borde redondeado" },
        { label: "font-size", snippet: "font-size: 14px;", desc: "Tamaño de fuente" },
        { label: "align-items", snippet: "align-items: center;", desc: "Alineación vertical" },
        { label: "justify-content", snippet: "justify-content: center;", desc: "Alineación horizontal" },
        { label: "box-shadow", snippet: "box-shadow: 0 4px 12px rgba(0,0,0,0.3);", desc: "Sombra paralela" }
    ],
    js: [
        { label: "function", snippet: "function miFuncion() {\n    \n}", desc: "Declaración de función" },
        { label: "addEventListener", snippet: 'addEventListener("click", (event) => {\n    \n});', desc: "Escuchador de eventos" },
        { label: "getElementById", snippet: 'document.getElementById("")', desc: "Obtener elemento por ID" },
        { label: "querySelector", snippet: 'document.querySelector("")', desc: "Seleccionar por CSS" },
        { label: "console.log", snippet: "console.log();", desc: "Imprimir en consola" },
        { label: "setTimeout", snippet: "setTimeout(() => {\n    \n}, 1000);", desc: "Temporizador de ejecución" },
        { label: "fetch", snippet: 'fetch("url")\n  .then(res => res.json())\n  .then(data => {\n    \n  });', desc: "Petición HTTP Fetch" }
    ]
};

function initAutocompleteAndFormatter() {
    const editor = document.getElementById("codeEditor");
    const popup = document.getElementById("autocompletePopup");

    if (!editor || !popup) return;

    editor.addEventListener("input", (e) => {
        if (!isAutocompleteEnabled) {
            popup.style.display = "none";
            return;
        }

        const cursor = editor.selectionStart;
        const textBefore = editor.value.substring(0, cursor);
        const match = textBefore.match(/([a-zA-Z0-9_\-<]+)$/);

        if (!match || match[1].length < 2) {
            popup.style.display = "none";
            return;
        }

        const query = match[1].toLowerCase().replace(/^</, "");
        const fileExt = typeof currentFileName !== "undefined" && currentFileName ? currentFileName.split(".").pop().toLowerCase() : "html";
        const category = fileExt === "js" ? "js" : (fileExt === "css" ? "css" : "html");

        currentCompletions = (COMPLETER_DICTIONARY[category] || []).filter(item => item.label.toLowerCase().includes(query));

        if (currentCompletions.length === 0) {
            popup.style.display = "none";
            return;
        }

        autocompleteSelectedIndex = 0;
        renderAutocompletePopup(match[1]);
    });

    editor.addEventListener("keydown", (e) => {
        if (popup.style.display === "block" && currentCompletions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                autocompleteSelectedIndex = (autocompleteSelectedIndex + 1) % currentCompletions.length;
                updateAutocompleteSelectionUI();
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                autocompleteSelectedIndex = (autocompleteSelectedIndex - 1 + currentCompletions.length) % currentCompletions.length;
                updateAutocompleteSelectionUI();
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertAutocompleteSnippet(currentCompletions[autocompleteSelectedIndex]);
                popup.style.display = "none";
                return;
            }
            if (e.key === "Escape") {
                popup.style.display = "none";
                return;
            }
        }

        // Ctrl+Shift+F: Formatear código
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "F" || e.key === "f")) {
            e.preventDefault();
            formatCurrentCode();
        }
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#autocompletePopup") && e.target !== editor) {
            popup.style.display = "none";
        }
    });
}

function renderAutocompletePopup(token) {
    const popup = document.getElementById("autocompletePopup");
    if (!popup) return;

    popup.innerHTML = "";
    currentCompletions.forEach((item, idx) => {
        const div = document.createElement("div");
        div.style.padding = "6px 10px";
        div.style.cursor = "pointer";
        div.style.fontSize = "11px";
        div.style.display = "flex";
        div.style.flexDirection = "column";
        div.style.borderBottom = "1px solid #1f1f1f";

        if (idx === autocompleteSelectedIndex) {
            div.style.background = "#25170d";
            div.style.color = "var(--orange)";
        } else {
            div.style.color = "#ccc";
        }

        div.innerHTML = `<strong style="font-size:11px;">${item.label}</strong><small style="color:#777; font-size:9px;">${item.desc}</small>`;

        div.addEventListener("click", () => {
            insertAutocompleteSnippet(item);
            popup.style.display = "none";
        });

        popup.appendChild(div);
    });

    popup.style.display = "block";
}

function updateAutocompleteSelectionUI() {
    const popup = document.getElementById("autocompletePopup");
    if (!popup) return;

    const items = popup.children;
    for (let i = 0; i < items.length; i++) {
        if (i === autocompleteSelectedIndex) {
            items[i].style.background = "#25170d";
            items[i].style.color = "var(--orange)";
        } else {
            items[i].style.background = "transparent";
            items[i].style.color = "#ccc";
        }
    }
}

function insertAutocompleteSnippet(item) {
    const editor = document.getElementById("codeEditor");
    if (!editor || !item) return;

    const cursor = editor.selectionStart;
    const textBefore = editor.value.substring(0, cursor);
    const match = textBefore.match(/([a-zA-Z0-9_\-<]+)$/);
    const tokenLength = match ? match[1].length : 0;

    const startPos = cursor - tokenLength;
    const textAfter = editor.value.substring(cursor);

    editor.value = editor.value.substring(0, startPos) + item.snippet + textAfter;
    editor.selectionStart = editor.selectionEnd = startPos + item.snippet.length;

    if (typeof saveCurrentFile === "function") saveCurrentFile();
    if (typeof updateLineCounter === "function") updateLineCounter();
    if (typeof updatePreview === "function") updatePreview();
}

/* =====================================================
   FORMATEADOR DE CÓDIGO (BEAUTIFIER)
===================================================== */
function formatCurrentCode() {
    const editor = document.getElementById("codeEditor");
    if (!editor || editor.disabled || !editor.value.trim()) return;

    const raw = editor.value;
    let formatted = raw;

    let indent = 0;
    const indentStr = "  "; // 2 espacios
    const lines = raw.split("\n");

    const formattedLines = lines.map(line => {
        let trimmed = line.trim();
        if (!trimmed) return "";

        // Si la línea empieza con etiqueta de cierre o }, reducir indentación antes
        if (trimmed.startsWith("</") || trimmed.startsWith("}") || trimmed.startsWith("]")) {
            indent = Math.max(0, indent - 1);
        }

        const currentLine = indentStr.repeat(indent) + trimmed;

        // Calcular ajuste de indentación para la siguiente línea
        const openTags = (trimmed.match(/<[a-zA-Z0-9]+(?:\s[^>]*)?>/g) || []).filter(tag => !tag.endsWith("/>") && !tag.startsWith("<!")).length;
        const closeTags = (trimmed.match(/<\/[a-zA-Z0-9]+>/g) || []).length;
        const openBrackets = (trimmed.match(/[\{\[]/g) || []).length;
        const closeBrackets = (trimmed.match(/[\}\]]/g) || []).length;

        indent += (openTags - closeTags) + (openBrackets - closeBrackets);
        indent = Math.max(0, indent);

        return currentLine;
    });

    editor.value = formattedLines.join("\n");

    if (typeof saveCurrentFile === "function") saveCurrentFile();
    if (typeof updateLineCounter === "function") updateLineCounter();
    if (typeof updatePreview === "function") updatePreview();

    if (typeof showTopNotification === "function") {
        showTopNotification("✨ Código formateado correctamente", null, 2500);
    }
}

/* =====================================================
   BUSCADOR Y REEMPLAZO DE CÓDIGO
===================================================== */
let searchMatches = [];
let currentMatchIndex = -1;

function initCodeSearchAndReplace() {
    const searchInput = document.getElementById("codeSearchInput");
    const replaceInput = document.getElementById("codeReplaceInput");
    const prevBtn = document.getElementById("codeSearchPrevBtn");
    const nextBtn = document.getElementById("codeSearchNextBtn");
    const replaceBtn = document.getElementById("codeReplaceBtn");
    const replaceAllBtn = document.getElementById("codeReplaceAllBtn");
    const closeBtn = document.getElementById("codeSearchCloseBtn");

    if (searchInput) searchInput.addEventListener("input", performCodeSearch);
    if (prevBtn) prevBtn.addEventListener("click", () => navigateSearchMatch(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => navigateSearchMatch(1));
    if (replaceBtn) replaceBtn.addEventListener("click", replaceCurrentMatch);
    if (replaceAllBtn) replaceAllBtn.addEventListener("click", replaceAllMatches);
    if (closeBtn) closeBtn.addEventListener("click", () => toggleCodeSearch(false));

    if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                navigateSearchMatch(e.shiftKey ? -1 : 1);
            }
            if (e.key === "Escape") {
                toggleCodeSearch(false);
            }
        });
    }

    if (replaceInput) {
        replaceInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                replaceCurrentMatch();
            }
        });
    }
}

function toggleCodeSearch(show) {
    const container = document.getElementById("codeSearchContainer");
    if (!container) return;

    if (typeof show === "undefined") {
        show = container.style.display === "none";
    }

    container.style.display = show ? "flex" : "none";

    if (show) {
        const searchInput = document.getElementById("codeSearchInput");
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
        performCodeSearch();
    } else {
        const editor = document.getElementById("codeEditor");
        if (editor) editor.focus();
    }
}

function performCodeSearch() {
    const editor = document.getElementById("codeEditor");
    const searchInput = document.getElementById("codeSearchInput");
    const countEl = document.getElementById("codeSearchMatchCount");

    if (!editor || !searchInput || !countEl) return;

    const query = searchInput.value;
    searchMatches = [];
    currentMatchIndex = -1;

    if (!query) {
        countEl.textContent = "0 / 0";
        return;
    }

    const text = editor.value;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let index = 0;

    while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
        searchMatches.push(index);
        index += query.length || 1;
    }

    if (searchMatches.length > 0) {
        currentMatchIndex = 0;
        highlightCurrentMatch();
    }

    updateMatchCountUI();
}

function updateMatchCountUI() {
    const countEl = document.getElementById("codeSearchMatchCount");
    if (!countEl) return;

    if (searchMatches.length === 0) {
        countEl.textContent = "0 / 0";
    } else {
        countEl.textContent = `${currentMatchIndex + 1} / ${searchMatches.length}`;
    }
}

function highlightCurrentMatch() {
    const editor = document.getElementById("codeEditor");
    const searchInput = document.getElementById("codeSearchInput");
    if (!editor || !searchInput || currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) return;

    const start = searchMatches[currentMatchIndex];
    const query = searchInput.value;
    const end = start + query.length;

    const activeEl = document.activeElement;
    editor.setSelectionRange(start, end);

    // Scroll editor to view match without stealing focus if typing in search inputs
    const textBefore = editor.value.substring(0, start);
    const lineCount = textBefore.split("\n").length;
    const lineHeight = 23; // standard line height for 14px editor
    editor.scrollTop = Math.max(0, (lineCount - 3) * lineHeight);

    if (activeEl && (activeEl.id === "codeSearchInput" || activeEl.id === "codeReplaceInput")) {
        activeEl.focus();
    } else {
        editor.focus();
    }
}

function navigateSearchMatch(dir) {
    if (searchMatches.length === 0) return;

    currentMatchIndex += dir;
    if (currentMatchIndex >= searchMatches.length) currentMatchIndex = 0;
    if (currentMatchIndex < 0) currentMatchIndex = searchMatches.length - 1;

    highlightCurrentMatch();
    updateMatchCountUI();
}

function replaceCurrentMatch() {
    const editor = document.getElementById("codeEditor");
    const searchInput = document.getElementById("codeSearchInput");
    const replaceInput = document.getElementById("codeReplaceInput");

    if (!editor || !searchInput || !replaceInput || currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) return;

    const query = searchInput.value;
    const replacement = replaceInput.value;
    const start = searchMatches[currentMatchIndex];

    const val = editor.value;
    editor.value = val.substring(0, start) + replacement + val.substring(start + query.length);

    if (typeof saveCurrentFile === "function") saveCurrentFile();
    if (typeof updateLineCounter === "function") updateLineCounter();
    if (typeof updatePreview === "function") updatePreview();

    performCodeSearch();
}

function replaceAllMatches() {
    const editor = document.getElementById("codeEditor");
    const searchInput = document.getElementById("codeSearchInput");
    const replaceInput = document.getElementById("codeReplaceInput");

    if (!editor || !searchInput || !replaceInput) return;

    const query = searchInput.value;
    if (!query) return;

    const replacement = replaceInput.value;
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

    const totalReplaced = searchMatches.length;
    editor.value = editor.value.replace(regex, replacement);

    if (typeof saveCurrentFile === "function") saveCurrentFile();
    if (typeof updateLineCounter === "function") updateLineCounter();
    if (typeof updatePreview === "function") updatePreview();

    performCodeSearch();
    if (typeof showTopNotification === "function") {
        showTopNotification(`✏️ Se reemplazaron ${totalReplaced} coincidencias`, null, 2500);
    }
}
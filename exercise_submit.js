function generate_latex_js_element(text_content){
    let new_latex_js = document.createElement("latex-js");
    new_latex_js.textContent = text_content;
    new_latex_js.setAttribute("baseURL", "https://cdn.jsdelivr.net/npm/latex.js/dist/");
    return new_latex_js;
}

// Remove latex_box from target_container, retrieves its id
// then create a new latex-js node containing new_text.
function refresh_latex_preview(target_container, latex_box, new_text){
    let new_latex_js = generate_latex_js_element(new_text);
    let box_id = latex_box.id;

    target_container.replaceChild(new_latex_js, latex_box);
    new_latex_js.setAttribute("id", box_id);
}

// source_container contains the text to parse with latex.js,
// target_container is a reference to a latex-js dom element
// does not work btw
function render_latex_from_dom_element(source_container, target_container){
    let generator = new latexjs.HtmlGenerator({ hyphenate: false });

    generator = latexjs.parse(source_container.textContent, { generator: generator });
    console.log("Text to render: " + generator.domFragment());
    target_container.textContent = generator.domFragment();
}

console.log("Loaded...");
document.addEventListener("DOMContentLoaded", function(event){

    var bt_submit = document.getElementById("bt_submit");
    var bt_preview = document.getElementById("bt_preview");

    // A latex-box holds a textarea and a latex-js custom node.
    var div_ex_previsu = document.getElementById("latex-box-ex");
    var div_sol_previsu = document.getElementById("latex-box-sol");

    var latex_text_exercise = document.getElementById("ex_text");
    var latex_text_answer = document.getElementById("sol_text");

    var latex_js_ex_previsu = document.getElementById("ex_previsu");
    var latex_js_sol_previsu = document.getElementById("sol_previsu");

    console.log("Loaded...");
    // The user asks to render the LaTeX preview
    bt_preview.onclick = function (e){
        console.log("Previewing...");
        // Preview of exercise...
        console.log("exercise text: " + latex_text_exercise.textContent);
        refresh_latex_preview(div_ex_previsu, latex_js_ex_previsu, latex_text_exercise.value);
        //...and the answer
        refresh_latex_preview(div_sol_previsu, latex_js_sol_previsu, latex_text_answer.value);
        //Important: since the latex-js nodes are replaced, their references latex_js_ex_previsu and
        //latex_js_sol_previsu must be updated !
        latex_js_ex_previsu = document.getElementById("ex_previsu");
        latex_js_sol_previsu = document.getElementById("sol_previsu");
    };

    // The user asks to submit this exercise.
    bt_submit.addEventListener ("onclick", function (e){
        console.log("Submitting...");
    });
});

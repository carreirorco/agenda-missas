/* aplica o tema antes de pintar (claro é o padrão) */
try{document.documentElement.setAttribute("data-theme",localStorage.getItem("missas-tema")==="dark"?"dark":"light")}catch(e){}

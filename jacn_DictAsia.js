/* global api */
class jacn_DictAsia {
  constructor(options) {
    this.options = options;
    this.maxexample = 2;
    this.word = "";
  }

  async displayName() {
    let locale = await api.locale();
    if (locale.indexOf("CN") != -1) return "DICT.ASIA(日中)";
    if (locale.indexOf("TW") != -1) return "DICT.ASIA(日中)";
    return "DICT.ASIA JP->CN Dictionary";
  }

  setOptions(options) {
    this.options = options;
    this.maxexample = options.maxexample;
  }

  async findTerm(word) {
    this.word = word;
    let promises = [this.findDictAsia(word)];
    let results = await Promise.all(promises);
    return [].concat(...results).filter((x) => x);
  }

  async findDictAsia(word) {
    let notes = [];
    if (!word) return notes; // return empty notes

    function T(node) {
      if (!node) return "";
      else return node.innerText.trim();
    }

    let base = "https://dict.asia/jc/";
    let url = base + encodeURIComponent(word);
    let doc = "";
    try {
      let data = await api.fetch(url);
      let parser = new DOMParser();
      doc = parser.parseFromString(data, "text/html");
    } catch (err) {
      return [];
    }

    let entries = doc.querySelectorAll("#jp_comment") || [];
    for (const entry of entries) {
      let definitions = [];
      let audios = [];

      let expression = T(entry.querySelector(".jpword"));
      let reading = "";
      let readings = entry.querySelectorAll(".trs_jp, .tone_jp");
      if (readings) {
        let reading_kana = T(readings[0]);
        let reading_trs = T(readings[1]);
        let reading_tone = T(readings[2]);
        reading =
          reading_kana || reading_trs
            ? `假名${reading_kana} 罗马音${reading_trs} ${reading_tone}`
            : "";
      }

      let sensbodys = entry.querySelectorAll("#comment_0") || [];
      for (const sensbody of sensbodys) {
        let pos = T(sensbody.querySelector(".wordtype"));
        pos = pos ? `<span class='pos'>${pos}</span>` : "";
        let meanings = [];
        let exampleBlocks = [];
        let exampleFlag = 0;
        sensbody.childNodes.forEach((element) => {
          const temp = element.textContent.trim();
          if (element.tagName === undefined && element.textContent)
            meanings.push(temp);
          if (element.tagName === "BR") {
            exampleBlocks.push("");
            exampleFlag++;
          }
          if (element.tagName === "P" && temp.indexOf("【") != 0)
            exampleBlocks[exampleFlag - 1] = temp;
        });
        meanings.splice(0, 1);
        // make definition segement
        let meaningFlag = 0;
        for (const meaning of meanings) {
          let chn_tran;
          let definition = "";
          chn_tran = `<span class='chn_tran'>${meaning}</span>`;
          let tran = `<span class='tran'>${chn_tran}</span>`;
          definition += `${pos}${tran}`;

          // make exmaple segement
          let examps = exampleBlocks[meaningFlag]?.split("　 ");
          //          examps.splice(0, 1);
          if (examps?.length > 0 && this.maxexample > 0) {
            definition += '<ul class="sents">';
            for (const [index, examp] of examps) {
              if (index > this.maxexample - 1) break; // to control only 2 example sentence.
              const [ja_examp, chn_examp] = examp.split("／");
              definition += `<li class='sent'><span class='ja_sent'>${ja_examp.replace(
                RegExp(expression, "gi"),
                `<b>${expression}</b>`
              )}</span><span class='chn_sent'>${chn_examp}</span></li>`;
            }
            definition += "</ul>";
          }
          definition && definitions.push(definition);
          meaningFlag++;
        }
      }
      let css = this.renderCSS();
      notes.push({
        css,
        expression,
        reading,
        definitions,
        audios,
      });
    }
    return notes;
  }

  renderCSS() {
    let css = `
            <style>
                div.phrasehead{margin: 2px 0;font-weight: bold;}
                span.star {color: #FFBB00;}
                span.pos  {text-transform:lowercase; font-size:0.9em; margin-right:5px; padding:2px 4px; color:white; background-color:#0d47a1; border-radius:3px;}
                span.tran {margin:0; padding:0;}
                span.chn_tran {color:#0d47a1;}
                ul.sents {font-size:0.8em; list-style:square inside; margin:3px 0;padding:5px;background:rgba(13,71,161,0.1); border-radius:5px;}
                li.sent  {margin:0; padding:0;}
                span.ja_sent {margin-right:5px;}
                span.chn_sent {color:#0d47a1;}
            </style>`;
    return css;
  }
}

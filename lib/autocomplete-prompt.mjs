import { icons } from "./icons.mjs";
import pc from "picocolors";
import AutocompletePrompt from "inquirer-autocomplete-prompt";

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
export function listRender(choices, pointer /*: string */) /*: string */ {
  let output = "";
  let separatorOffset = 0;

  choices.forEach((choice, i) => {
    if (choice.type === "separator") {
      separatorOffset++;
      output += "  " + choice + "\n";
      return;
    }

    if (choice.disabled) {
      separatorOffset++;
      let line =
        (icons.emoji
          ? icons.spacer + icons.cross
          : icons.cross + icons.spacer) + choice.name;
      line +=
        " (" +
        (typeof choice.disabled === "string" ? choice.disabled : "Disabled") +
        ")";
      output += pc.dim(line) + "\n";
      return;
    }

    const prefix = choice.prefix ? choice.prefix + " " : "";
    const isSelected = i - separatorOffset === pointer;
    let line =
      (isSelected ? `${icons.pointer} ` : icons.spacer + " ") +
      prefix +
      choice.name;

    if (isSelected) {
      line = pc.cyan(line);
    }

    output += line + " \n";
  });

  return output.replace(/\n$/, "");
}

export class AutocompletePromptPrefixed extends AutocompletePrompt {
  /**
   * Render the prompt to screen
   * @return {undefined}
   */
  render(error /*: ?string */) {
    // Render question
    let content = this.getQuestion();
    let bottomContent = "";

    if (this.firstRender) {
      const suggestText = this.opt.suggestOnly ? ", tab to autocomplete" : "";
      content += pc.dim(
        "(Use arrow keys or type to search" + suggestText + ") "
      );
    }

    // Render choices or answer depending on the state
    if (this.status === "answered") {
      content += pc.cyan(this.shortAnswer || this.answerName || this.answer);
    } else if (this.searching) {
      content += this.rl.line;
      bottomContent += "  " + pc.dim(this.opt.searchText || "Searching...");
    } else if (this.nbChoices) {
      const choicesStr = listRender(this.currentChoices, this.selected);
      content += this.rl.line;
      const indexPosition = this.selected;
      let realIndexPosition = 0;
      this.currentChoices.choices.every((choice, index) => {
        if (index > indexPosition) {
          return false;
        }
        const name = choice.name;
        realIndexPosition += name ? name.split("\n").length : 0;
        return true;
      });
      bottomContent += this.paginator.paginate(
        choicesStr,
        realIndexPosition,
        this.opt.pageSize
      );
    } else {
      content += this.rl.line;
      bottomContent += "  " + pc.yellow(this.opt.emptyText || "No results...");
    }

    if (error) {
      bottomContent += "\n" + pc.red(">> ") + error;
    }

    this.firstRender = false;

    this.screen.render(content, bottomContent);
  }
}

.PHONY: all clean pdf publish

SRC = resume.tex
FILENAME ?= resume
OUTPUT_DIR = output
OUTPUT_PDF = $(OUTPUT_DIR)/$(FILENAME).pdf
PUBLIC_PDF = ../public/$(FILENAME).pdf

all: publish

$(OUTPUT_PDF): $(SRC) secrets.tex
	@mkdir -p $(OUTPUT_DIR)
	pdflatex -jobname=$(FILENAME) -output-directory=$(OUTPUT_DIR) $(SRC)
	pdflatex -jobname=$(FILENAME) -output-directory=$(OUTPUT_DIR) $(SRC)

pdf: $(OUTPUT_PDF)

publish: $(OUTPUT_PDF)
	cp $(OUTPUT_PDF) $(PUBLIC_PDF)

clean:
	rm -rf $(OUTPUT_DIR)

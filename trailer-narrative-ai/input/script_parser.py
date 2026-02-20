"""Script file parsing (PDF, TXT, Fountain format)."""

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Union, Dict, Any
from loguru import logger

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False


@dataclass
class DialogueLine:
    """Single line of dialogue."""
    character: str
    text: str
    parenthetical: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "character": self.character,
            "text": self.text,
            "parenthetical": self.parenthetical
        }


@dataclass
class ScriptScene:
    """Parsed script scene."""
    scene_number: Optional[str]
    heading: str  # INT./EXT. LOCATION - TIME
    location: str
    time_of_day: Optional[str]
    description: str
    dialogue: List[DialogueLine] = field(default_factory=list)
    characters: List[str] = field(default_factory=list)
    action_lines: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_number": self.scene_number,
            "heading": self.heading,
            "location": self.location,
            "time_of_day": self.time_of_day,
            "description": self.description,
            "dialogue": [d.to_dict() for d in self.dialogue],
            "characters": self.characters,
            "action_lines": self.action_lines
        }


@dataclass
class ParsedScript:
    """Complete parsed script."""
    title: Optional[str]
    scenes: List[ScriptScene]
    total_pages: int
    raw_text: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "scenes": [s.to_dict() for s in self.scenes],
            "total_pages": self.total_pages,
            "scene_count": len(self.scenes)
        }


class ScriptParser:
    """Parse screenplay/script files."""

    # Scene heading patterns
    SCENE_HEADING_PATTERN = re.compile(
        r'^((?:INT\.|EXT\.|INT/EXT\.|I/E\.)\s*.+?)(?:\s*-\s*(DAY|NIGHT|MORNING|EVENING|DAWN|DUSK|CONTINUOUS|LATER|SAME))?$',
        re.IGNORECASE | re.MULTILINE
    )

    # Character name pattern (ALL CAPS, possibly with (V.O.) or (O.S.))
    CHARACTER_PATTERN = re.compile(
        r'^([A-Z][A-Z\s\.\-\']+?)(?:\s*\((V\.O\.|O\.S\.|O\.C\.|CONT\'D|CONTINUED)\))?$'
    )

    # Parenthetical pattern
    PARENTHETICAL_PATTERN = re.compile(r'^\(([^)]+)\)$')

    # Scene number pattern
    SCENE_NUMBER_PATTERN = re.compile(r'^(\d+[A-Z]?)\s*$')

    def __init__(self, file_path: Optional[Union[str, Path]] = None):
        """Initialize script parser.

        Args:
            file_path: Path to script file (optional)
        """
        self.file_path = Path(file_path) if file_path else None

    def parse(
        self,
        file_path: Optional[Union[str, Path]] = None,
        text: Optional[str] = None,
        format_hint: Optional[str] = None
    ) -> ParsedScript:
        """Parse a script file or text.

        Args:
            file_path: Path to script file
            text: Raw script text
            format_hint: Format hint ('pdf', 'txt', 'fountain')

        Returns:
            ParsedScript object
        """
        if text:
            return self._parse_text(text)

        file_path = Path(file_path or self.file_path)
        if not file_path:
            raise ValueError("No file path or text provided")

        suffix = file_path.suffix.lower()
        format_type = format_hint or suffix.lstrip('.')

        logger.info(f"Parsing script: {file_path} (format: {format_type})")

        if format_type == 'pdf' or suffix == '.pdf':
            return self._parse_pdf(file_path)
        elif format_type == 'fountain' or suffix == '.fountain':
            return self._parse_fountain(file_path)
        else:  # Default to plain text
            return self._parse_txt(file_path)

    def _parse_pdf(self, file_path: Path) -> ParsedScript:
        """Parse PDF script file.

        Args:
            file_path: Path to PDF file

        Returns:
            ParsedScript object
        """
        if HAS_PYMUPDF:
            return self._parse_pdf_pymupdf(file_path)
        elif HAS_PDFPLUMBER:
            return self._parse_pdf_pdfplumber(file_path)
        else:
            raise ImportError(
                "PDF parsing requires PyMuPDF or pdfplumber. "
                "Install with: pip install PyMuPDF pdfplumber"
            )

    def _parse_pdf_pymupdf(self, file_path: Path) -> ParsedScript:
        """Parse PDF using PyMuPDF."""
        doc = fitz.open(file_path)
        text_parts = []

        for page in doc:
            text_parts.append(page.get_text())

        full_text = '\n'.join(text_parts)
        doc.close()

        parsed = self._parse_text(full_text)
        parsed.total_pages = len(text_parts)

        return parsed

    def _parse_pdf_pdfplumber(self, file_path: Path) -> ParsedScript:
        """Parse PDF using pdfplumber."""
        text_parts = []

        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                text_parts.append(text)

        full_text = '\n'.join(text_parts)

        parsed = self._parse_text(full_text)
        parsed.total_pages = len(text_parts)

        return parsed

    def _parse_txt(self, file_path: Path) -> ParsedScript:
        """Parse plain text script file."""
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()

        return self._parse_text(text)

    def _parse_fountain(self, file_path: Path) -> ParsedScript:
        """Parse Fountain format screenplay.

        Fountain is a plain text markup language for screenplays.
        See: https://fountain.io/syntax
        """
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()

        # Fountain-specific preprocessing
        # Force scene headings with leading dots
        text = re.sub(r'^\.(.+)$', r'INT. \1', text, flags=re.MULTILINE)

        # Force character names with @
        text = re.sub(r'^@(.+)$', lambda m: m.group(1).upper(), text, flags=re.MULTILINE)

        return self._parse_text(text)

    def _parse_text(self, text: str) -> ParsedScript:
        """Parse raw script text.

        Args:
            text: Raw script text

        Returns:
            ParsedScript object
        """
        scenes = []
        current_scene = None
        current_character = None
        lines = text.split('\n')

        # Try to extract title from first few lines
        title = self._extract_title(lines[:20])

        for line in lines:
            line = line.strip()

            if not line:
                current_character = None
                continue

            # Check for scene heading
            scene_match = self.SCENE_HEADING_PATTERN.match(line)
            if scene_match:
                if current_scene:
                    current_scene.characters = list(set(current_scene.characters))
                    scenes.append(current_scene)

                heading = scene_match.group(1).strip()
                time_of_day = scene_match.group(2)

                # Extract location from heading
                location = self._extract_location(heading)

                current_scene = ScriptScene(
                    scene_number=self._extract_scene_number(line),
                    heading=heading,
                    location=location,
                    time_of_day=time_of_day,
                    description="",
                    dialogue=[],
                    characters=[],
                    action_lines=[]
                )
                current_character = None
                continue

            # Skip if no current scene
            if not current_scene:
                continue

            # Check for character name
            char_match = self.CHARACTER_PATTERN.match(line)
            if char_match and len(line) < 40:  # Character names are usually short
                current_character = char_match.group(1).strip()
                if current_character not in current_scene.characters:
                    current_scene.characters.append(current_character)
                continue

            # Check for parenthetical
            paren_match = self.PARENTHETICAL_PATTERN.match(line)
            if paren_match and current_character:
                # Add to last dialogue if exists
                if current_scene.dialogue:
                    current_scene.dialogue[-1].parenthetical = paren_match.group(1)
                continue

            # Check if this is dialogue (follows character name)
            if current_character:
                current_scene.dialogue.append(DialogueLine(
                    character=current_character,
                    text=line
                ))
                current_character = None
                continue

            # Otherwise it's action/description
            current_scene.action_lines.append(line)
            if len(current_scene.description) < 500:
                current_scene.description += line + " "

        # Add last scene
        if current_scene:
            current_scene.characters = list(set(current_scene.characters))
            scenes.append(current_scene)

        logger.info(f"Parsed {len(scenes)} scenes from script")

        return ParsedScript(
            title=title,
            scenes=scenes,
            total_pages=len(text) // 3000,  # Rough estimate
            raw_text=text
        )

    def _extract_title(self, lines: List[str]) -> Optional[str]:
        """Extract title from script header."""
        for line in lines:
            line = line.strip()
            if line and not line.startswith(('INT.', 'EXT.', 'FADE')):
                # Skip common non-title lines
                if any(x in line.upper() for x in ['WRITTEN BY', 'DRAFT', 'PAGE']):
                    continue
                if len(line) > 5 and len(line) < 100:
                    return line
        return None

    def _extract_location(self, heading: str) -> str:
        """Extract location from scene heading."""
        # Remove INT./EXT. prefix
        location = re.sub(r'^(?:INT\.|EXT\.|INT/EXT\.|I/E\.)\s*', '', heading)
        # Remove time of day suffix
        location = re.sub(r'\s*-\s*(?:DAY|NIGHT|MORNING|EVENING|DAWN|DUSK|CONTINUOUS|LATER|SAME).*$', '', location, flags=re.IGNORECASE)
        return location.strip()

    def _extract_scene_number(self, line: str) -> Optional[str]:
        """Extract scene number if present."""
        # Scene numbers often appear before or after heading
        parts = line.split()
        if parts:
            match = self.SCENE_NUMBER_PATTERN.match(parts[0])
            if match:
                return match.group(1)
            match = self.SCENE_NUMBER_PATTERN.match(parts[-1])
            if match:
                return match.group(1)
        return None

    def get_all_dialogue(self) -> List[DialogueLine]:
        """Get all dialogue from parsed script.

        Returns:
            List of all dialogue lines
        """
        if not hasattr(self, '_parsed') or self._parsed is None:
            raise ValueError("No script parsed yet")

        all_dialogue = []
        for scene in self._parsed.scenes:
            all_dialogue.extend(scene.dialogue)
        return all_dialogue

    def get_dialogue_text(self) -> str:
        """Get all dialogue as plain text.

        Returns:
            All dialogue concatenated
        """
        dialogue = self.get_all_dialogue()
        return ' '.join(d.text for d in dialogue)

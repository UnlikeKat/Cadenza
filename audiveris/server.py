"""
Cadenza OMR Service
AGPL-3.0 License - Open-source wrapper for Audiveris 5.7.1
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import tempfile
import logging
import shutil
import sys
import zipfile
import re

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

AUDIVERIS_CMD = '/opt/audiveris/bin/Audiveris'
CONVERSION_TIMEOUT = 600

RECOMMENDED_DPI = 300
RECOMMENDED_MIN_WIDTH = 1700
RECOMMENDED_MIN_HEIGHT = 2200

def clean_filename(filename):
    """Remove ALL extensions from filename, leaving only the base name"""
    # Start with the filename
    name = filename

    # Keep removing everything after the FIRST dot
    if '.' in name:
        name = name.split('.')[0]

    # Remove any special characters (keep only alphanumeric, spaces, hyphens, underscores)
    name = re.sub(r'[^\w\s-]', '', name)

    # Remove extra whitespace
    name = name.strip()

    logger.info(f"Cleaned '{filename}' -> '{name}'")

    return name

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "cadenza-omr",
        "version": "1.0.0",
        "audiveris": "5.7.1",
        "audiveris_path": AUDIVERIS_CMD,
        "timeout": CONVERSION_TIMEOUT,
        "recommended_dpi": RECOMMENDED_DPI,
        "recommended_min_resolution": f"{RECOMMENDED_MIN_WIDTH}x{RECOMMENDED_MIN_HEIGHT}"
    })

@app.route('/convert', methods=['POST'])
def convert():
    """Convert uploaded sheet music to MusicXML"""

    logger.info("=" * 50)
    logger.info("Received conversion request")

    if 'file' not in request.files:
        logger.error("No file in request")
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    original_filename = file.filename
    logger.info(f"Original filename: {original_filename}")

    if original_filename == '':
        return jsonify({"error": "Empty filename"}), 400

    allowed_extensions = {'.png', '.jpg', '.jpeg', '.pdf', '.tif', '.tiff'}
    file_ext = os.path.splitext(original_filename)[1].lower()

    if file_ext not in allowed_extensions:
        return jsonify({
            "error": f"Unsupported file type: {file_ext}",
            "supported": list(allowed_extensions)
        }), 400

    # Clean filename - THIS MUST WORK
    base_filename = clean_filename(original_filename)

    if not base_filename:
        base_filename = "output"
        logger.warning("Filename cleaning resulted in empty string, using 'output'")

    logger.info(f"Base filename: {base_filename}")

    # Save uploaded file
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_input:
        file.save(tmp_input.name)
        input_path = tmp_input.name

    logger.info(f"Saved to: {input_path}")

    output_dir = tempfile.mkdtemp()
    logger.info(f"Output dir: {output_dir}")

    warnings = []

    try:
        logger.info(f"Starting Audiveris conversion (timeout: {CONVERSION_TIMEOUT}s)...")

        cmd = [
            AUDIVERIS_CMD,
            '-batch',
            '-export',
            '-option', 'org.audiveris.omr.sheet.BookManager.useCompression=false',
            '-output', output_dir,
            input_path
        ]

        logger.info(f"Command: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=CONVERSION_TIMEOUT
        )

        logger.info(f"Return code: {result.returncode}")

        # Check for quality warnings
        if "too low interline value" in result.stdout:
            logger.warning("Low resolution detected")
            warnings.append({
                "type": "low_resolution",
                "message": f"Image resolution is below recommended {RECOMMENDED_DPI} DPI",
                "recommendation": f"For best results, use images at least {RECOMMENDED_MIN_WIDTH}x{RECOMMENDED_MIN_HEIGHT} pixels ({RECOMMENDED_DPI} DPI)",
                "impact": "Recognition accuracy may be reduced"
            })

        if "flagged as invalid" in result.stdout:
            logger.warning("Sheet flagged as invalid by Audiveris")
            warnings.append({
                "type": "recognition_failed",
                "message": "Audiveris could not recognize musical notation",
                "recommendation": "Ensure the image is clear, well-lit, and contains standard musical notation",
                "impact": "No output will be generated"
            })

        if "Could not export since transcription did not complete successfully" in result.stdout:
            logger.warning("Transcription incomplete")
            warnings.append({
                "type": "transcription_incomplete",
                "message": "Audiveris could not complete the transcription",
                "recommendation": "Try improving image quality or contrast",
                "impact": "No MusicXML output will be generated"
            })

        # List output files
        output_files = os.listdir(output_dir)
        logger.info(f"Output files: {output_files}")

        # Look for MusicXML files
        mxl_files = [f for f in output_files if f.endswith('.mxl')]
        xml_files = [f for f in output_files if f.endswith('.xml') and not f.endswith('.musicxml')]
        musicxml_files = [f for f in output_files if f.endswith('.musicxml')]

        output_path = None

        if musicxml_files:
            output_path = os.path.join(output_dir, musicxml_files[0])
            logger.info(f"Found .musicxml: {output_path}")
        elif xml_files:
            output_path = os.path.join(output_dir, xml_files[0])
            logger.info(f"Found .xml: {output_path}")
        elif mxl_files:
            mxl_path = os.path.join(output_dir, mxl_files[0])
            logger.info(f"Extracting .mxl: {mxl_path}")

            try:
                with zipfile.ZipFile(mxl_path, 'r') as zip_ref:
                    xml_in_zip = [f for f in zip_ref.namelist() if f.endswith('.xml')]
                    if xml_in_zip:
                        extract_path = os.path.join(output_dir, 'extracted.xml')
                        with zip_ref.open(xml_in_zip[0]) as source, open(extract_path, 'wb') as target:
                            target.write(source.read())
                        output_path = extract_path
                        logger.info(f"Extracted XML from .mxl")
            except Exception as e:
                logger.error(f"Failed to extract .mxl: {e}")

        if not output_path:
            logger.error("No MusicXML output generated")

            error_response = {
                "error": "Conversion failed - no valid output",
                "details": "Audiveris processed the file but did not produce MusicXML",
                "output_files": output_files,
                "warnings": warnings,
                "audiveris_log": result.stdout[-1000:],
                "recommendations": {
                    "resolution": f"Use images at least {RECOMMENDED_MIN_WIDTH}x{RECOMMENDED_MIN_HEIGHT} pixels",
                    "dpi": f"{RECOMMENDED_DPI} DPI recommended",
                    "format": "PDF or high-quality PNG/JPEG",
                    "quality": "Clear, high-contrast images with standard musical notation"
                }
            }

            return jsonify(error_response), 500

        # Read MusicXML content
        with open(output_path, 'rb') as f:
            musicxml_data = f.read()

        # FINAL filename (no extensions!)
        output_filename = f"{base_filename}.musicxml"

        logger.info(f"SUCCESS! MusicXML size: {len(musicxml_data)} bytes")
        logger.info(f"FINAL Output filename: {output_filename}")

        # Cleanup
        os.remove(input_path)
        shutil.rmtree(output_dir)

        # Return with clean filename
        response_headers = {
            'Content-Type': 'application/vnd.recordare.musicxml+xml',
            'Content-Disposition': f'attachment; filename="{output_filename}"'
        }

        if warnings:
            import json
            response_headers['X-Conversion-Warnings'] = json.dumps(warnings)

        logger.info(f"Response headers: {response_headers}")

        return musicxml_data, 200, response_headers

    except subprocess.TimeoutExpired:
        logger.error(f"Conversion timeout ({CONVERSION_TIMEOUT}s)")
        return jsonify({
            "error": "Timeout - processing took too long",
            "details": f"Conversion exceeded {CONVERSION_TIMEOUT} seconds",
            "suggestion": "Try splitting the PDF into smaller chunks",
            "max_timeout": CONVERSION_TIMEOUT
        }), 504

    except Exception as e:
        logger.error(f"Exception: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        "name": "Cadenza OMR Service",
        "version": "1.0.0",
        "audiveris_version": "5.7.1",
        "license": "AGPL-3.0",
        "recommended_specs": {
            "dpi": RECOMMENDED_DPI,
            "min_resolution": f"{RECOMMENDED_MIN_WIDTH}x{RECOMMENDED_MIN_HEIGHT}",
            "formats": ["PDF", "PNG", "JPEG", "TIFF"]
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

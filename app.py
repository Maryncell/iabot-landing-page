from flask import Flask, send_from_directory

app = Flask(__name__, static_folder='dist')

@app.route('/')
def home():
    return send_from_directory('dist', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('dist', path)

@app.route('/api/contacto', methods=['POST'])
def contacto():
    # Aquí procesarías los datos del formulario
    return {"status": "success"}

if __name__ == '__main__':
    app.run(port=3000)
from flask import Flask, send_from_directory, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv

# Cargar variables de entorno del archivo .env
load_dotenv()

app = Flask(__name__, static_folder='dist')

# Configuración de la base de datos
# Usaremos SQLite para el MVP. La ruta 'sqlite:///site.db' crea un archivo site.db en la raíz del proyecto.
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Para deshabilitar advertencias, no es esencial para el funcionamiento

db = SQLAlchemy(app)

# Definición de un modelo de ejemplo para Planes
class Plan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), unique=True, nullable=False)
    precio = db.Column(db.Float, nullable=False)
    descripcion = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Plan {self.nombre}>'

# Rutas para servir el front-end (sin cambios aquí)
@app.route('/')
def home():
    return send_from_directory('dist', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('dist', path)

# Endpoint para el formulario de contacto (lo que ya tenías)
@app.route('/api/contacto', methods=['POST'])
def contacto():
    data = request.get_json()
    print(f"Datos recibidos del formulario: {data}")
    # Aquí procesarías los datos del formulario (ej. guardar en DB, enviar email)
    return jsonify({"status": "success", "message": "Consulta recibida"})

# --- NUEVOS ENDPOINTS DE EJEMPLO PARA LA BASE DE DATOS ---
@app.route('/api/planes', methods=['GET'])
def get_planes():
    planes = Plan.query.all()
    # Convertir objetos Plan a diccionarios para jsonify
    planes_data = [{"id": p.id, "nombre": p.nombre, "precio": p.precio, "descripcion": p.descripcion} for p in planes]
    return jsonify(planes_data)

@app.route('/api/planes', methods=['POST'])
def add_plan():
    data = request.get_json()
    if not data or not all(key in data for key in ['nombre', 'precio']):
        return jsonify({"error": "Faltan datos de nombre o precio"}), 400

    # Validar que el nombre no exista ya
    existing_plan = Plan.query.filter_by(nombre=data['nombre']).first()
    if existing_plan:
        return jsonify({"error": f"El plan '{data['nombre']}' ya existe"}), 409

    new_plan = Plan(
        nombre=data['nombre'],
        precio=data['precio'],
        descripcion=data.get('descripcion') # description es opcional
    )
    db.session.add(new_plan)
    db.session.commit()
    return jsonify({"message": "Plan añadido exitosamente", "plan": {"id": new_plan.id, "nombre": new_plan.nombre, "precio": new_plan.precio}}), 201


if __name__ == '__main__':
    # --- MUY IMPORTANTE: Crear las tablas de la base de datos ---
    # Esto debe ejecutarse *antes* de app.run() y solo una vez o cuando necesites actualizar el esquema.
    # En un entorno de producción, usarías migraciones (ej. Flask-Migrate).
    with app.app_context():
        db.create_all()
        # Opcional: añadir datos iniciales si la tabla está vacía
        if Plan.query.count() == 0:
            plan_basico = Plan(nombre="Básico", precio=100.00, descripcion="Bot web básico")
            plan_avanzado = Plan(nombre="Avanzado", precio=300.00, descripcion="Bot multicanal + alertas")
            plan_premium = Plan(nombre="Premium", precio=500.00, descripcion="Bot IA + soporte 24/7 + tickets")
            db.session.add_all([plan_basico, plan_avanzado, plan_premium])
            db.session.commit()
            print("Planes iniciales añadidos a la base de datos.")
        else:
            print("La base de datos ya contiene planes.")


    app.run(port=3000, debug=True) # debug=True para desarrollo, deshabilitar en producción
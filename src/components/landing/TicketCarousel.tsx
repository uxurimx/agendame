"use client";

import { useState, useEffect, useCallback } from "react";

const tickets = [
  { name: "Estefanía Duarte",  service: "Aplicación gelish",                     time: "2 de julio · 9:00 am",   price: "$150" },
  { name: "Diana Sánchez",     service: "Cita de pestañas + microblading",        time: "6 de julio · 11:00 am",  price: "$2,200" },
  { name: "José Torres",       service: "Corte de cabello + delineado de barba",  time: "9 de julio · 4:00 pm",   price: "$499" },
  { name: "Renata Silva",      service: "Depilación de cejas + facial exprés",    time: "8 de julio · 1:00 pm",   price: "$480" },
];

export default function TicketCarousel() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  const goTo = useCallback((i: number) => {
    setFading(true);
    setTimeout(() => {
      setCurrent(i);
      setFading(false);
    }, 250);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % tickets.length;
        setFading(true);
        setTimeout(() => setFading(false), 250);
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const t = tickets[current];

  return (
    <div>
      <div className="ticket hero-visual" aria-label="Ejemplos de citas confirmadas en Agéndame">
        <div
          className="ticket-split"
          style={{ opacity: fading ? 0 : 1, transition: "opacity 0.3s ease" }}
        >
          <div className="ticket-main">
            <p className="p-name">{t.name}</p>
            <p className="p-service">{t.service}</p>
            <p className="p-time">{t.time}</p>
            <span className="status-pill">Confirmada ✓</span>
          </div>
          <div className="ticket-stub">
            <span className="stub-label">Total</span>
            <span className="price">{t.price}</span>
          </div>
        </div>
      </div>
      <div className="carousel-dots" role="tablist" aria-label="Seleccionar ejemplo de cita">
        {tickets.map((_, i) => (
          <button
            key={i}
            className={`carousel-dot${i === current ? " active" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Ver cita ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

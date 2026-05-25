# Propuesta de Programa: Sistema de Precios Dinámicos para Bebidas tipo “Bolsa”

## 1. Descripción general del proyecto

La idea consiste en desarrollar un programa para un pub en el que los precios de las bebidas funcionen de forma dinámica, simulando una especie de “bolsa de valores”.

El sistema mostrará en una pantalla principal las bebidas disponibles y sus precios actuales. Estos precios irán subiendo y bajando automáticamente cada cierto tiempo, generando una experiencia más interactiva, visual y atractiva para los clientes.

El objetivo es que los clientes puedan consultar en tiempo real el precio de cada bebida y aprovechar los momentos en los que una bebida tenga un precio más bajo.

---

## 2. Funcionamiento general del sistema

El programa deberá mostrar una lista de bebidas organizadas por categorías.

Cada bebida tendrá un precio actual, que se actualizará automáticamente cada 10 minutos. Estos precios no serán completamente aleatorios, sino que deberán seleccionarse únicamente entre una lista de precios previamente definida.

Además, el sistema deberá mostrar de forma visual si el precio de una bebida ha subido o ha bajado respecto a la actualización anterior.

---

## 3. Activación y desactivación manual del programa

El programa no deberá funcionar automáticamente según un horario fijo, sino que deberá poder activarse y desactivarse manualmente.

Para ello, deberá existir un botón principal tipo:

**INICIAR**

Al pulsar este botón, el sistema comenzará a funcionar y empezará la actualización automática de precios cada 10 minutos.

También deberá existir la posibilidad de detener o desactivar el sistema manualmente cuando sea necesario.

---

## 4. Categorías y bebidas disponibles

Las bebidas estarán organizadas por categorías de la siguiente manera:

### Ginebra

- Larios 12
- Seagrams
- Beefeater
- Tanqueray
- Puerto de Indias

### Ron

- Barceló
- Brugal
- Santa Teresa
- Cacique

### Whisky

- Red Label
- Ballantines 10
- J&B
- DYC 8

### Vodka

- Absolut

---

## 5. Precios disponibles

Los precios no podrán ser valores libres, sino que deberán elegirse únicamente entre los siguientes precios fijados:

- 4,50 €
- 5,00 €
- 5,20 €
- 5,50 €
- 5,70 €
- 6,00 €
- 6,50 €
- 7,00 €
- 7,50 €
- 8,00 €

Cada 10 minutos, el sistema asignará un nuevo precio a cada bebida utilizando exclusivamente estos valores.

---

## 6. Lógica de variación de precios

Aunque los precios puedan variar entre 4,50 € y 8,00 €, la lógica del sistema deberá hacer que la mayoría de las veces los precios se mantengan en un rango medio.

El rango más habitual deberá estar entre:

- 5,50 €
- 6,00 €
- 6,50 €

De esta forma, el sistema dará sensación de movimiento y dinamismo, pero sin generar cambios demasiado extremos o poco realistas en los precios.

Los precios más bajos y más altos podrán aparecer, pero con menor frecuencia.

---

## 7. Bebidas más vendidas y lógica especial

Algunas bebidas son consideradas las más vendidas y, por tanto, deberán tener una lógica especial para evitar que estén demasiado tiempo al precio mínimo.

Las bebidas más vendidas son:

- Seagrams
- Beefeater
- Barceló
- Brugal
- Red Label
- Ballantines 10

Estas bebidas solo podrán aparecer a **4,50 € una vez por hora**.

Durante el resto del tiempo, estas bebidas deberán moverse únicamente entre los precios de **5,00 € y 8,00 €**, respetando siempre la lista de precios fijados.

Esta regla permite mantener el atractivo de los precios bajos sin perjudicar las bebidas con mayor demanda.

---

## 8. Golden Time

El programa deberá incluir una función especial llamada:

**Golden Time**

Esta función será activada manualmente por el camarero mediante un botón específico dentro del sistema.

Al pulsar el botón **Golden Time**, todas las bebidas pasarán automáticamente a costar **5,00 €** durante un periodo de **5 minutos**.

Una vez finalizados esos 5 minutos, el sistema deberá volver automáticamente al funcionamiento normal de precios dinámicos.

---

## 9. Visualización del Golden Time

Cuando se active el Golden Time, deberá aparecer un aviso destacado en la pantalla principal con el texto:

**GOLDEN TIME**

Este aviso deberá mostrarse en grande y de forma muy visible para que todos los clientes puedan verlo fácilmente.

Además, al activarse el Golden Time, deberá sonar un efecto de sonido similar al sonido de “gold” de una ruleta, para llamar la atención de los clientes y reforzar el efecto visual del momento especial.

Durante el Golden Time, también deberá mostrarse una cuenta atrás indicando el tiempo restante hasta que finalice.

Ejemplo:

**Golden Time termina en: 09:32**

---

## 10. Cuenta atrás para Golden Time

Además de mostrar la cuenta atrás cuando el Golden Time esté activo, el sistema deberá poder mostrar una cuenta atrás previa indicando cuánto falta para que comience el próximo Golden Time, si esta función está programada o preparada para activarse.

Ejemplo:

**Golden Time empieza en: 09:32**

De esta forma, los clientes podrán ver que se aproxima un momento especial y estarán más atentos a la pantalla.

---

## 11. Pantalla principal del sistema

La pantalla principal deberá estar pensada para ser mostrada en una televisión, monitor o pantalla visible dentro del pub.

Deberá mostrar de forma clara y atractiva la siguiente información:

- Categorías de bebidas.
- Nombre de cada bebida.
- Precio actual de cada bebida.
- Indicador visual de si el precio ha subido o ha bajado respecto al precio anterior.
- Aviso destacado de **GOLDEN TIME** cuando esté activo.
- Cuenta atrás del Golden Time cuando corresponda.
- Cuenta atrás para la próxima actualización de precios.
- Diseño visual claro, dinámico y fácil de leer desde cierta distancia.

La idea es que los clientes puedan consultar fácilmente los precios en tiempo real y que la pantalla forme parte de la experiencia del local.

---

## 12. Actualización automática de precios

Una vez iniciado el programa, los precios deberán actualizarse automáticamente cada 10 minutos.

La pantalla deberá mostrar también una cuenta atrás para la siguiente actualización de precios.

Ejemplo:

**Próxima actualización de precios en: 04:27**

Cuando la cuenta atrás llegue a cero, el sistema recalculará los precios de todas las bebidas siguiendo las reglas establecidas.

---

## 13. Objetivo del programa

El objetivo principal del programa es crear una experiencia más atractiva e interactiva para los clientes, haciendo que los precios de las bebidas cambien durante la jornada como si se tratara de una bolsa de valores.

Este sistema puede ayudar a:

- Generar más interacción con los clientes.
- Hacer que los clientes estén pendientes de la pantalla.
- Incentivar la compra en determinados momentos.
- Crear una dinámica divertida dentro del local.
- Promocionar bebidas concretas sin modificar manualmente los precios.
- Dar una imagen más moderna y original al pub.

--

## 14. Idea visual del sistema

El sistema debería tener una estética llamativa, similar a una pantalla de mercado o bolsa, pero adaptada al ambiente de un pub.

Se podrían utilizar elementos visuales como:

- Flechas hacia arriba para precios que suben.
- Flechas hacia abajo para precios que bajan.
- Colores diferenciados para subidas y bajadas.
- Animaciones al actualizar precios.
- Aviso especial para Golden Time.
- Cuenta atrás visible y dinámica.
- Diseño oscuro o tipo neón para encajar con el ambiente nocturno del local.

# OSI Model Simulator

**Simulation of Data Encapsulation and Decapsulation in the OSI Model**

An interactive educational simulator built with plain HTML, CSS, and JavaScript that demonstrates how data moves through all 7 layers of the OSI model — encapsulated on the sender side and decapsulated on the receiver side.

## Features

- 5 predefined network devices with realistic IPs, MACs, and ports
- User-selectable Transport Protocol (TCP / UDP) and Encoding Technique (UTF-8 / ASCII / Base64)
- Dynamic encapsulation with real source/destination IPs, MACs, ports, session IDs, and FCS values
- Step-by-step simulation through all 14 stages (7 sender + 7 receiver)
- Layer highlighting with active/completed/inactive states
- Binary conversion at the Physical layer
- Packet transmission animation
- Responsive dark-themed UI

## How to Use

1. Select a **Sender** and **Receiver** device
2. Enter a **Message**
3. Choose **Transport Protocol** and **Encoding Technique**
4. Click **Next Step** to advance through each OSI layer
5. Click **Reset** to start over

## Tech Stack

- HTML5
- CSS3 (vanilla, no frameworks)
- Vanilla JavaScript

## Authors

- **Jiya Patel** (24BCE307)
- **Dhara Kharadi** (24BCE309)

## License

This project is built as a Data Communication course assignment.
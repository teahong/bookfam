import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface KnowledgeGraphProps {
    books: any[];
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ books }) => {
    const svgRef = useRef<SVGSVGElement>(null);


    useEffect(() => {
        if (!books.length || !svgRef.current) return;

        const width = 800;
        const height = 400;

        // Clear previous SVG
        const svgElement = d3.select(svgRef.current);
        svgElement.selectAll("*").remove();

        const svg = svgElement
            .attr("viewBox", [0, 0, width, height])
            .attr("width", "100%")
            .attr("height", height);

        // Add Zoom behavior
        const g = svg.append("g");

        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event: any) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom as any);


        // Prepare data
        const nodes: any[] = [{ id: "Root", type: "root", label: "지식 창고" }];
        const links: any[] = [];
        const addedNodes = new Set(["Root"]);


        books.forEach(book => {
            // 1. Book Node
            if (!addedNodes.has(book.id)) {
                nodes.push({ id: book.id, type: "book", label: book.title });
                addedNodes.add(book.id);
            }
            links.push({ source: "Root", target: book.id });

            // 2. Author Node (Simplified: Representative Author)
            if (book.author) {
                // Split by common delimiters and take the first one
                const mainAuthor = book.author.split(/,|\||\//)[0].trim();
                const authorId = `author-${mainAuthor}`;

                if (!addedNodes.has(authorId)) {
                    nodes.push({ id: authorId, type: "author", label: mainAuthor });
                    addedNodes.add(authorId);
                }
                links.push({ source: book.id, target: authorId });
            }

            // 3. Keywords (From DB) - Limit to 3 per book
            if (book.keywords && Array.isArray(book.keywords)) {
                book.keywords.slice(0, 3).forEach((keyword: string) => {
                    const keywordId = `keyword-${keyword}`;
                    // Check if node already exists to avoid duplicates
                    if (!nodes.find(n => n.id === keywordId)) {
                        nodes.push({ id: keywordId, type: 'keyword', label: keyword }); // Changed group/name to type/label for consistency
                        addedNodes.add(keywordId); // Add to addedNodes set
                    }
                    links.push({ source: book.id, target: keywordId }); // Removed value: 1 as it's not used elsewhere
                });
            }

            // Publisher removed as requested
        });

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id((d: any) => d.id).distance(80))
            .force("charge", d3.forceManyBody().strength(-200)) // Increased repulsion
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(30));

        const link = g.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line");

        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("cursor", "pointer")
            .call(drag(simulation) as any);

        node.append("circle")
            .attr("r", (d: any) => {
                if (d.type === 'root') return 20;
                if (d.type === 'book') return 15;
                if (d.type === 'author') return 10;
                return 8; // keyword
            })
            .attr("fill", (d: any) => {
                if (d.type === 'root') return "#6d5dfc";
                if (d.type === 'book') return "#e91e63";
                if (d.type === 'author') return "#f39c12";
                return "#00b894"; // keyword color
            });

        node.append("text")
            .text((d: any) => d.label)
            .attr("x", 15)
            .attr("y", 5)
            .style("font-size", (d: any) => d.type === 'keyword' ? "10px" : "12px")
            .style("fill", "#333")
            .style("font-weight", (d: any) => d.type === 'book' ? "bold" : "normal")
            .style("text-shadow", "1px 1px 0px white");

        simulation.on("tick", () => {
            link
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);

            node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });

        function drag(simulation: any) {
            function dragstarted(event: any) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
            function dragged(event: any) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
            function dragended(event: any) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
            return d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
        }
    }, [books]);

    return (
        <div className="glass-card" style={{ marginTop: '40px', padding: '20px' }}>
            <h3 style={{ marginBottom: '20px' }}>나의 독서 지식 그래프</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px', textAlign: 'center' }}>
                마우스 휠로 확대/축소하고 드래그하여 이동할 수 있습니다.
            </p>
            <div style={{ border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', background: '#f8f9fa' }}>
                <svg ref={svgRef} style={{ width: '100%', cursor: 'grab' }}></svg>
            </div>
            <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', marginTop: '15px', justifyContent: 'center' }}>
                <span><span style={{ color: '#6d5dfc' }}>●</span> 전집(Root)</span>
                <span><span style={{ color: '#e91e63' }}>●</span> 도서</span>
                <span><span style={{ color: '#f39c12' }}>●</span> 대표 저자</span>
                <span><span style={{ color: '#00b894' }}>●</span> 키워드</span>
            </div>
        </div>
    );
};
export default KnowledgeGraph;
